// app/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { RootClientPage } from './root-client'

export default function Page() {
  return <RootClientPage />
}