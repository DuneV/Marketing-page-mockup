// app/dashboard/layout.tsx
"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthRole } from "@/lib/auth/useAuthRole"

export default function DashboardGuardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, role, loading } = useAuthRole()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/auth/login")
      return
    }
    
    if (role !== "company" && role !== "admin") {
      router.replace("/auth/login")
    }
  }, [user, role, loading, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  if (!user) return null
  if (role !== "company" && role !== "admin") return null

  return <>{children}</>
}
