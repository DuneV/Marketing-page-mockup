"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthRole, clearRoleCache } from "@/lib/auth/useAuthRole"

export default function RedirectPage() {
  const router = useRouter()
  const { user, role, loading, error } = useAuthRole()

  useEffect(() => {
    if (loading) return

    // Si hay error, mostrar información y volver al login
    if (error) {
      console.error("[Redirect] Error obteniendo rol:", error)
      alert("Error al cargar perfil de usuario. Por favor intenta nuevamente.")
      clearRoleCache()
      router.push("/auth/login")
      return
    }

    // Si no hay usuario, volver al login
    if (!user) {
      console.log("[Redirect] No hay usuario, redirigiendo a login")
      router.push("/auth/login")
      return
    }

    // Si no hay rol, el usuario no está configurado correctamente
    if (!role) {
      console.warn("[Redirect] Usuario sin rol asignado")
      alert("Tu cuenta no tiene un rol asignado. Contacta al administrador.")
      router.push("/auth/login")
      return
    }

    // Redirigir según rol
    console.log("[Redirect] Redirigiendo a:", role)

    if (role === "admin") {
      router.push("/admin")
    } else if (role === "company") {
      router.push("/company")
    } else {
      router.push("/dashboard")
    }
  }, [loading, user, role, error, router])

  // Mostrar loading mientras se determina el destino
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">
          {error ? "Error al cargar perfil..." : "Cargando tu perfil..."}
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error.message}</p>
        )}
      </div>
    </div>
  )
}
