"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/dashboard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuthRole } from "@/lib/auth/useAuthRole"
import { Button } from "@/components/ui/button"

export default function CompanyPage() {
  const router = useRouter()
  const { user, role, loading, error } = useAuthRole()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else if (role !== "company") {
        // Si no es empresa, redirigir según su rol
        if (role === "admin") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      }
    }
  }, [loading, user, role, router])

  // Mostrar error si existe
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-md p-6">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error al cargar panel de empresa
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error.message}
          </p>
          <Button
            onClick={() => router.push("/auth/login")}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Volver al Login
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user || role !== "company") {
    return null
  }

  return (
    <DashboardLayout userType="company" isAdmin={false}>
      <Dashboard activeView="overview" userType="company" />
    </DashboardLayout>
  )
}
