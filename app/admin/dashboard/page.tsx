// app/admin/dashboard/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { DashboardClientPage } from './dashboard-client'

export default function AdminDashboardPage() {
  return <DashboardClientPage />
}