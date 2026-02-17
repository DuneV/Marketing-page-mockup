// app/admin/dashboard/dashboard-client.tsx
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminDashboardView } from "@/components/views/admin-dashboard-view"

export function DashboardClientPage() {  // ← Cambiado
  return <AdminDashboardView />
}