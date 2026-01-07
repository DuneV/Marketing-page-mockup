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
      // No hay usuario, redirigir a login
      router.push("/auth/login")
      return
    }

    // Redirigir según el rol
    if (role === "admin") {
      router.push("/admin")
    } else if (role === "company") {
      router.push("/company")
    } else if (role === "employee") {
      router.push("/employee")
    } else {
      // Rol desconocido, limpiar cache y redirigir a login
      clearUserCache()
      router.push("/auth/login")
    }
  }, [user, role, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Redirigiendo...</p>
      </div>
    </div>
  )
}