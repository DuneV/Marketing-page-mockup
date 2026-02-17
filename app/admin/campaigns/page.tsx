// app/admin/campaigns/page.tsx

// Force dynamic rendering (server component)
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { CampaignsClientPage } from './campaigns-client'

export default function CampaignsPage() {
  return <CampaignsClientPage />
}