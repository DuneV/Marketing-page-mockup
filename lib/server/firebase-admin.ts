import admin from "firebase-admin"

const hasServiceAccount =
  !!process.env.FIREBASE_PROJECT_ID &&
  !!process.env.FIREBASE_CLIENT_EMAIL &&
  !!process.env.FIREBASE_PRIVATE_KEY

if (!admin.apps.length) {
  if (hasServiceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    })
  } else {
    admin.initializeApp()
  }
}

export { admin }

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    const e = new Error("NO_TOKEN")
    ;(e as any).status = 401
    throw e
  }

  const decoded = await admin.auth().verifyIdToken(token)
  const snap = await admin.firestore().doc(`users/${decoded.uid}`).get()
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined

  if (role !== "admin") {
    const e = new Error("FORBIDDEN")
    ;(e as any).status = 403
    throw e
  }

  return { uid: decoded.uid, email: decoded.email ?? null }
}
