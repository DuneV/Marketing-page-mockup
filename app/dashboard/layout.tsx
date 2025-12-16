"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthRole } from "@/lib/auth/useAuthRole"

export default function DashboardLayoutGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, role, loading } = useAuthRole()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace("/auth/login")
    else if (role === "admin") router.replace("/admin")
    else if (role === "company") router.replace("/company")
  }, [user, role, loading, router])

  if (loading) return <div className="min-h-screen grid place-items-center">Cargando...</div>
  if (!user) return null
  
  if (role !== "employee") return null

  return <>{children}</>
}
