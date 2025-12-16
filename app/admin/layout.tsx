"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthRole } from "@/lib/auth/useAuthRole"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, role, loading } = useAuthRole()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace("/auth/login")
    else if (role !== "admin") router.replace("/dashboard")
  }, [user, role, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user || role !== "admin") return null
  return <>{children}</>
}
