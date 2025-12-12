"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminView } from "@/components/views/admin-view"

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userType, setUserType] = useState<"employee" | "company">("company")

  useEffect(() => {
    const user = localStorage.getItem("user")

    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.authenticated) {
          setIsAuthenticated(true)
          setUserType(userData.userType || "company")

          // Only company users can access admin
          if (userData.userType !== "company") {
            router.push("/dashboard")
            return
          }

          setIsLoading(false)
          return
        }
      } catch (e) {
        console.log("Error parsing user data")
      }
    }

    router.push("/auth/login")
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout userType={userType}>
      <AdminView />
    </DashboardLayout>
  )
}
