// --- FILE: app/dashboard/campaigns/page.tsx ---
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { CampaignsClientPage } from './campaigns-client'
export default function CampaignsPage() {
  return <CampaignsClientPage />
}
