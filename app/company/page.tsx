// --- FILE: app/company/page.tsx ---
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { CompanyClientPage } from './company-client'
export default function CompanyPage() {
  return <CompanyClientPage />
}