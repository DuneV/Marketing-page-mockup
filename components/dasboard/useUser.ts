"use client"

import { useEffect, useState } from "react"

export type UserRole = "company" | "employee"

export function useUser() {
  const [userType, setUserType] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) {
      setLoading(false)
      return
    }

    try {
      const user = JSON.parse(stored)
      setUserType(user.userType)
    } catch {
      setUserType(null)
    }

    setLoading(false)
  }, [])

  return { userType, loading }
}
