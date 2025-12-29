// lib/data/users.ts

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { UserDocSchema, type UserDoc } from "@/lib/schemas/user"

export async function upsertUser(uid: string, data: UserDoc) {
  const parsed = UserDocSchema.parse(data)

  await setDoc(
    doc(db, "users", uid),
    { ...parsed, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
    { merge: true }
  )
}

export async function getUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  return UserDocSchema.parse(snap.data())
}

/**
 * Asignar o desasignar una campaña a un usuario
 * @param uid - ID del usuario
 * @param campaignId - ID de la campaña (null para desasignar)
 */
export async function assignUserToCampaign(uid: string, campaignId: string | null) {
  await updateDoc(doc(db, "users", uid), {
    campanaActualId: campaignId,
    updatedAt: serverTimestamp(),
  })
}
