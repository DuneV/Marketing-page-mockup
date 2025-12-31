"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { AdminThemeStorage, type AdminTheme } from "@/lib/admin-theme-storage"

export function AdminSettingsView() {
  const [theme, setTheme] = useState<AdminTheme>({ primary: "#d97706", accent: "#dc2626", background: "#ffffff" })

  useEffect(() => {
    setTheme(AdminThemeStorage.get())
  }, [])

  const apply = (t: AdminTheme) => {
    const r = document.documentElement
    r.style.setProperty("--admin-primary", t.primary)
    r.style.setProperty("--admin-accent", t.accent)
    r.style.setProperty("--admin-bg", t.background ?? "#ffffff")
  }

  const save = () => {
    AdminThemeStorage.set(theme)
    apply(theme)
  }

  const reset = () => {
    const d: AdminTheme = { primary: "#d97706", accent: "#dc2626", background: "#ffffff" }
    setTheme(d)
    AdminThemeStorage.set(d)
    apply(d)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-amber-600" />
        <h2 className="text-2xl font-bold">Configuración (Admin)</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Colores del Admin Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm block mb-1">Primary</label>
              <input
                type="color"
                value={theme.primary}
                onChange={(e) => setTheme((t) => ({ ...t, primary: e.target.value }))}
              />
              <div className="text-xs mt-1">{theme.primary}</div>
            </div>

            <div>
              <label className="text-sm block mb-1">Accent</label>
              <input
                type="color"
                value={theme.accent}
                onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))}
              />
              <div className="text-xs mt-1">{theme.accent}</div>
            </div>

            <div>
              <label className="text-sm block mb-1">Background</label>
              <input
                type="color"
                value={theme.background ?? "#ffffff"}
                onChange={(e) => setTheme((t) => ({ ...t, background: e.target.value }))}
              />
              <div className="text-xs mt-1">{theme.background}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} className="bg-amber-600 hover:bg-amber-700">
              Guardar
            </Button>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                apply(theme)
              }}
            >
              Preview
            </Button>
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              background: "var(--admin-bg)",
              borderColor: "rgba(0,0,0,.08)",
            }}
          >
            <div className="font-semibold mb-2">Preview</div>
            <div className="flex gap-2">
              <span
                className="px-3 py-1 rounded text-white text-sm"
                style={{ background: "var(--admin-primary)" }}
              >
                Primary
              </span>
              <span
                className="px-3 py-1 rounded text-white text-sm"
                style={{ background: "var(--admin-accent)" }}
              >
                Accent
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
