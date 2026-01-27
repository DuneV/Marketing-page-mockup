// app/redirect/page.tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthRole, clearUserCache } from "@/lib/auth/useAuthRole"

export default function RedirectPage() {
  const router = useRouter()
  const { user, role, loading } = useAuthRole()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/auth/login")
      return
    }

    if (role === "admin") {
      router.replace("/admin")
      return
    }

    if (role === "company") {
      router.replace("/company")
      return
    }

    if (role === "employee") {
      router.replace("/dashboard")
      return
    }

    clearUserCache()
    router.replace("/auth/login")
  }, [user, role, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  )
}
