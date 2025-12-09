// dashboard/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/dashboard"

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem("user")
    console.log("Checking auth - user:", user)

    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.authenticated) {
          setIsAuthenticated(true)
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
          <p className="text-slate-600 dark:text-slate-400">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Dashboard /> : null
}
