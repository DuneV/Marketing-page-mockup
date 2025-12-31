import admin from "firebase-admin"

let inited = false
function init() {
  if (inited) return
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
  inited = true
}

export async function requireAdmin(req: any) {
  init()

  const header = req.headers.authorization ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) {
    const e: any = new Error("NO_TOKEN")
    e.status = 401
    throw e
  }

  const decoded = await admin.auth().verifyIdToken(token)

  // check opcional pero recomendado
  if (process.env.FIREBASE_PROJECT_ID && decoded.aud !== process.env.FIREBASE_PROJECT_ID) {
    const e: any = new Error("INVALID_AUDIENCE")
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
