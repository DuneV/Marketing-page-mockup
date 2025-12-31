"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase/client"
import { doc, getDoc } from "firebase/firestore"

type Role = "admin" | "company" | "employee"

export default function Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.replace("/auth/login")
          return
        }

        const snap = await getDoc(doc(db, "users", user.uid))
        const role = (snap.exists() ? (snap.data().role as Role | undefined) : undefined)

        if (role === "admin") {
          router.replace("/admin")
          return
        }

        if (role === "company") {
          router.replace("/dashboard")
          return
        }

        if (role === "employee") {
          router.replace("/dashboard")
          return
        }
        
        router.replace("/auth/login")
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsub()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return null
}
