// app/admin/admin-client.tsx
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminDashboardView } from "@/components/views/admin-dashboard-view"

export function AdminClientPage() {  // ← Cambiado
  return <AdminDashboardView />
}