// app/admin/users/page.tsx

"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { UsersAdminView } from "@/components/views/users-admin-view"

export default function UsersAdminPage() {
  return (
    <DashboardLayout userType={"employee"} isAdmin={true}>
      <UsersAdminView />
    </DashboardLayout>
  )
}
