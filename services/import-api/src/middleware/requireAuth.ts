// services\import-api\src\middleware\requireAuth.ts

import { admin, firebaseProjectId } from "../lib/firebaseAdmin.js"

export type Role = "admin" | "company" | "employee" | null

export interface AuthContext {
  uid: string
  email: string | null
  role: Role
  companyId: string | null
}

export async function requireAuth(req: any): Promise<AuthContext> {
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

  // Role + companyId los tomamos de Firestore (misma fuente que ya usas)
  const snap = await admin.firestore().doc(`users/${decoded.uid}`).get()
  const data = snap.exists ? snap.data() : null

  const role = (data?.role as Role) ?? null
  const companyId = (data?.companyId ?? data?.empresaId ?? null) as string | null

  // Permitimos admin o company 
  if (role !== "admin" && role !== "company") {
    const e: any = new Error("FORBIDDEN")
    e.status = 403
    throw e
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    role,
    companyId,
  }
}
