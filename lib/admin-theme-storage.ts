export type AdminTheme = {
  primary: string // e.g. "#d97706"
  accent: string  // e.g. "#dc2626"
  background: string // optional
}

const KEY = "admin_theme_v1"

export const AdminThemeStorage = {
  get(): AdminTheme {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null
    if (!raw) return { primary: "#d97706", accent: "#dc2626", background: "#ffffff" }
    try {
      return JSON.parse(raw) as AdminTheme
    } catch {
      return { primary: "#d97706", accent: "#dc2626", background: "#ffffff" }
    }
  },
  set(theme: AdminTheme) {
    localStorage.setItem(KEY, JSON.stringify(theme))
  },
}
