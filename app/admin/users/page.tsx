// app/admin/users/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { UsersClientPage } from './users-client'

export default function UsersAdminPage() {
  return <UsersClientPage />
}