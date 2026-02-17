// app/admin/companies/page.tsx

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { CompaniesClientPage } from './companies-client'

export default function CompaniesPage() {
  return <CompaniesClientPage />
}