// services/import-api/src/middleware/requireCompanyManager.ts
import { admin, firebaseProjectId } from "../lib/firebaseAdmin.js"

export type CompanyRole = "owner" | "manager" | "member"

export interface CompanyAuthContext {
  uid: string
  email: string | null
  role: "admin" | "company"
  companyId: string
  companyRole: CompanyRole
  areaId: string | null
}

/**
 * Permite:
 * - admin (pasa)
 * - company con companyRole owner/manager (pasa)
 *
 * Fuente de verdad: Firestore users/{uid}
 */
export async function requireCompanyManager(req: any): Promise<CompanyAuthContext> {
  const header = req.headers.authorization ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) {
    const e: any = new Error("NO_TOKEN")
    e.status = 401
    throw e
  }

  const decoded = await admin.auth().verifyIdToken(token)

  if (firebaseProjectId && decoded.aud !== firebaseProjectId) {
    const e: any = new Error(`INVALID_AUDIENCE expected=${firebaseProjectId} got=${decoded.aud}`)
    e.status = 401
    throw e
  }

  const snap = await admin.firestore().doc(`users/${decoded.uid}`).get()
  const data = snap.exists ? (snap.data() as any) : null

  const role = (data?.role as "admin" | "company" | undefined) ?? undefined
  const companyId = (data?.companyId ?? data?.empresaId ?? null) as string | null

  // companyRole puede venir de Firestore, o lo default a member
  const companyRole = ((data?.companyRole ?? data?.company_role ?? "member") as CompanyRole) ?? "member"
  const areaId = (data?.areaId ?? null) as string | null

  if (!role || (role !== "admin" && role !== "company")) {
    const e: any = new Error("FORBIDDEN")
    e.status = 403
    throw e
  }

  // admin puede operar sin companyId
  if (role === "admin") {
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: "admin",
      companyId: companyId ?? "",
      companyRole: "owner",
      areaId: null,
    }
  }

  // company debe tener companyId
  if (!companyId) {
    const e: any = new Error("MISSING_COMPANY_ID")
    e.status = 403
    throw e
  }

  // solo owner/manager
  if (companyRole !== "owner" && companyRole !== "manager") {
    const e: any = new Error("FORBIDDEN_NOT_MANAGER")
    e.status = 403
    throw e
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    role: "company",
    companyId,
    companyRole,
    areaId,
  }
}