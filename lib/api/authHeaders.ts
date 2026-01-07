// lib/api/authHeaders.ts

import { getAuth } from "firebase/auth"

export async function authHeaders() {
  const user = getAuth().currentUser
  if (!user) throw new Error("No auth user")
  const token = await user.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}
