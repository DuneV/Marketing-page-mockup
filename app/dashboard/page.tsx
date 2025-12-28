// app/dashboard/page.tsx
"use client"

import Dashboard from "@/components/dashboard"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function DashboardPage() {
  return (
    <DashboardLayout userType="company" isAdmin={false}>
      <Dashboard activeView="overview" userType="company" />
    </DashboardLayout>
  )
}
