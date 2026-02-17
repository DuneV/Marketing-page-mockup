// --- FILE: app/auth/login/page.tsx ---
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { LoginClientPage } from './login-client'
export default function LoginPage() {
  return <LoginClientPage />
}