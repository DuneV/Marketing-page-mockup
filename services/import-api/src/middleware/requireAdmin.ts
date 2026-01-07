// services/import-api/src/middleware/requireAdmin.ts
import { admin, firebaseProjectId } from "../lib/firebaseAdmin.js"

export async function requireAdmin(req: any) {
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
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined

  if (role !== "admin") {
    const e: any = new Error("FORBIDDEN")
    e.status = 403
    throw e
  }

  return { uid: decoded.uid, email: decoded.email ?? null }
}
