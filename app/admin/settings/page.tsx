// app/admin/settings/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { SettingsClientPage } from './settings-client'

export default function AdminSettingsPage() {
  return <SettingsClientPage />
}