// app/admin/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { AdminClientPage } from './admin-client'

export default function AdminDashboardPage() {
  return <AdminClientPage />
}