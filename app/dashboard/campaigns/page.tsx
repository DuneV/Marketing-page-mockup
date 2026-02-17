// --- FILE: app/campaigns/page.tsx ---
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { CampaignsPageClient } from './campaigns-client'
export default function CampaignsPage() {
  return <CampaignsPageClient />
}