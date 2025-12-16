// app/admin/companies/page.tsx 

"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminView } from "@/components/views/admin-view"

export default function AdminCompaniesPage() {
  return (
    <DashboardLayout userType={"employee"} isAdmin={true}>
      <AdminView />
    </DashboardLayout>
  )
}

