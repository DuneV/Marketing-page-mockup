// dashboard/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/dashboard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignsView } from "@/components/views/campaigns-view"
import { SettingsView } from "@/components/views/settings-view"
import { AdminView } from "@/components/views/admin-view"
import type { ViewType } from "@/components/app-sidebar"

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<ViewType>("overview")
  const [userType, setUserType] = useState<"employee" | "company">("company")

  useEffect(() => {
    const user = localStorage.getItem("user")
    console.log("Checking auth - user:", user)

    if (user) {
      try {
        const userData = JSON.parse(user)
        if (userData.authenticated) {
          setIsAuthenticated(true)
          setUserType(userData.userType || "company")
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

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout
      activeView={activeView}
      onNavigate={setActiveView}
      userType={userType}
    >
      {activeView === "overview" && <Dashboard activeView="overview" userType={userType} />}
      {activeView === "people" && <Dashboard activeView="people" userType={userType} />}
      {activeView === "company" && <Dashboard activeView="company" userType={userType} />}
      {activeView === "employee" && <Dashboard activeView="employee" userType={userType} />}
      {activeView === "campaigns" && <CampaignsView />}
      {activeView === "settings" && <SettingsView />}
      {activeView === "admin" && <AdminView />}
    </DashboardLayout>
  )
}
