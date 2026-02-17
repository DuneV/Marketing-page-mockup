// --- FILE: app/settings/page.tsx ---
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { SettingsPageClient } from './settings-client'
export default function SettingsPage() {
  return <SettingsPageClient />
}