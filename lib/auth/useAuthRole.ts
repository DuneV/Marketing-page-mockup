"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/client"

export type Role = "admin" | "company" | "employee" | null

export function useAuthRole() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)

      if (!u) {
        setRole(null)
        setLoading(false)
        return
      }

      try {
        const snap = await getDoc(doc(db, "users", u.uid))
        const r = snap.exists() ? (snap.data().role as Role) : null
        setRole(r ?? null)
      } catch {
        setRole(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
  }, [])

  return { user, role, loading }
}
