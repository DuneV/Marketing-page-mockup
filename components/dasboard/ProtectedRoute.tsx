"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, UserRole } from "./useUser"

export default function ProtectedRoute({
  children,
  allowed,
}: {
  children: React.ReactNode
  allowed: UserRole[]
}) {
  const { userType, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!userType || !allowed.includes(userType))) {
      router.push("/auth/login")
    }
  }, [loading, userType])

  if (loading) return null

  return <>{children}</>
}
