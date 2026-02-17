// app/admin/settings/settings-client.tsx
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AdminSettingsView } from "@/components/views/admin-settings-view"

export function SettingsClientPage() {  // ← Cambiado
  return <AdminSettingsView />
}