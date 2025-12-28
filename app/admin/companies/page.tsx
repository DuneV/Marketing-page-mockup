// app/admin/companies/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminView } from "@/components/views/admin-view"

export default function AdminCompaniesPage() {
  return (
    <AdminLayout>
      <AdminView />
    </AdminLayout>
  )
}
