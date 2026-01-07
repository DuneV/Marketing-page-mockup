// services/import-api/src/lib/firebaseAdmin.ts
import admin from "firebase-admin"

let firebaseProjectId: string | null = null

function init() {
  if (admin.apps.length) return

  const saJson = process.env.FIREBASE_ADMIN_SA_JSON
  if (saJson) {
    const creds = JSON.parse(saJson)
    firebaseProjectId = creds.project_id
    admin.initializeApp({
      credential: admin.credential.cert(creds),
      projectId: creds.project_id,
    })
    return
  }

  const hasServiceAccount =
    !!process.env.FIREBASE_PROJECT_ID &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY

  if (hasServiceAccount) {
    firebaseProjectId = process.env.FIREBASE_PROJECT_ID!
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID!,
    })
    return
  }

  // Fallback: NO recomendado porque no sabemos qué project agarra
  admin.initializeApp()
}

init()

export { admin, firebaseProjectId }
