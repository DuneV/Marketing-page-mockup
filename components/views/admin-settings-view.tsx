// components/views/admin-settings-view.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { addCanonicalField, getAdminSchema, type CanonicalSqlType } from "@/lib/api/adminSchemas"

const IMPORT_TYPE = "campaigns"

export function AdminSettingsView() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [canonicalFields, setCanonicalFields] = useState<Record<string, { type?: CanonicalSqlType }>>({})

  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<CanonicalSqlType>("string")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setErr(null)
      const s = await getAdminSchema(IMPORT_TYPE)
      setCanonicalFields(s.canonical_fields ?? {})
    } catch (e: any) {
      setErr(e?.message ?? "Error loading schema")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sorted = useMemo(
    () =>
      Object.entries(canonicalFields)
        .map(([name, meta]) => ({ name, type: meta?.type ?? "string" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [canonicalFields]
  )

  const onAdd = async () => {
    try {
      const name = newName.trim()
      if (!name) return
      setSaving(true)
      setErr(null)
      await addCanonicalField(IMPORT_TYPE, { name, type: newType })
      setNewName("")
      setNewType("string")
      await load()
    } catch (e: any) {
      setErr(e?.message ?? "Error adding field")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Configuración (Admin)</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canonical Fields (Import: {IMPORT_TYPE})</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {err ? (
            <div className="text-sm rounded-md border border-destructive/30 bg-destructive/10 p-3 text-foreground">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-2">
              <label className="text-sm block mb-1">Nombre del campo</label>
              <input
                className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm"
                placeholder="ej: promoter_or_seller_name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="text-xs mt-1 text-muted-foreground">snake_case, sin espacios.</div>
            </div>

            <div>
              <label className="text-sm block mb-1">Tipo</label>

              {/* Select arreglado para dark/light */}
              <div className="relative">
                <select
                  className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm appearance-none pr-10"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CanonicalSqlType)}
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="date">date</option>
                  <option value="boolean">boolean</option>
                  <option value="text">text</option>
                  <option value="image">image</option>
                </select>

                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onAdd} className="bg-primary text-primary-foreground" disabled={saving || !newName.trim()}>
              {saving ? "Agregando..." : "Agregar campo"}
            </Button>

            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? "Cargando..." : "Refrescar"}
            </Button>
          </div>

          <div className="rounded-lg border border-border p-3 bg-card">
            <div className="font-semibold mb-2">Campos actuales</div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : sorted.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay campos aún.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sorted.map((f) => (
                  <div key={f.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2 bg-background">
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground border border-border">
                      {f.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Tip: después de agregar el canonical field, podrás mapearlo en el import mapping (commit) y luego aparecerá en
            <code className="px-1">/available-fields</code>.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
