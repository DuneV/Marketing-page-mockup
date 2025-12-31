"use client"

import { useEffect } from "react"
import { AdminThemeStorage } from "@/lib/admin-theme-storage"

export function useAdminTheme() {
  useEffect(() => {
    const t = AdminThemeStorage.get()
    const r = document.documentElement
    r.style.setProperty("--admin-primary", t.primary)
    r.style.setProperty("--admin-accent", t.accent)
    r.style.setProperty("--admin-bg", t.background ?? "#ffffff")
  }, [])
}
