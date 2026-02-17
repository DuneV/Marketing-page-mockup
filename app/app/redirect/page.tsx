// app/redirect/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { RedirectClientPage } from './redirect-client'

export default function RedirectPage() {
  return <RedirectClientPage />
}