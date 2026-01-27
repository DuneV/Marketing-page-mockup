// app/company/campaigns/[campaignId]/layout.tsx

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthRole } from "@/lib/auth/useAuthRole"

export default function CompanyCampaignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, role, loading } = useAuthRole()

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!user || role !== "company") {
    return null
  }

  return <>{children}</>
}