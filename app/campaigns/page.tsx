"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignsView } from "@/components/views/campaigns-view"
import { useAuthRole } from "@/lib/auth/useAuthRole"
import { Button } from "@/components/ui/button"

export default function CampaignsPage() {
  const router = useRouter()
  const { user, role, loading, error } = useAuthRole()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [loading, user, router])

  // Mostrar error si existe
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-md p-6">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error al cargar campañas
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error.message}
          </p>
          <Button
            onClick={() => router.push("/auth/login")}
            className="bg-amber-600 hover:bg-amber-700 text-white"
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

  if (!user) {
    return null
  }

  // Determinar userType basado en el rol
  const userType: "employee" | "company" = role === "company" ? "company" : "employee"
  const isAdmin = role === "admin"

  return (
    <DashboardLayout userType={userType} isAdmin={isAdmin}>
      <CampaignsView />
    </DashboardLayout>
  )
}
