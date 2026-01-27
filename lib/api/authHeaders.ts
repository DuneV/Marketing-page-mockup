// lib/api/authHeaders.ts
"use client"

import { auth } from "@/lib/firebase/client"

export async function authHeaders() {
  if (typeof window === "undefined") {
    throw new Error("authHeaders() is client-only. Do not call it inside Next Route Handlers.")
  }

  const user = auth.currentUser
  if (!user) throw new Error("No auth user")

  const token = await user.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}
