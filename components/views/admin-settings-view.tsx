// components/views/admin-settings-view.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Pencil, Trash2 } from "lucide-react"
import {
  addCanonicalField,
  deleteCanonicalField,
  getAdminSchema,
  updateCanonicalField,
  type CanonicalSqlType,
} from "@/lib/api/adminSchemas"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const IMPORT_TYPE = "campaigns"

type Row = { name: string; type: CanonicalSqlType }

export function AdminSettingsView() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [canonicalFields, setCanonicalFields] = useState<Record<string, { type?: CanonicalSqlType }>>({})

  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<CanonicalSqlType>("string")
  const [saving, setSaving] = useState(false)

  // Search
  const [search, setSearch] = useState("")

  // Dialogs
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [editType, setEditType] = useState<CanonicalSqlType>("string")
  const [editName, setEditName] = useState("")
  const [mutating, setMutating] = useState(false)

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
        .map(([name, meta]) => ({ name, type: (meta?.type ?? "string") as CanonicalSqlType }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [canonicalFields]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q))
  }, [sorted, search])

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

  const openEdit = (row: Row) => {
    setSelected(row)
    setEditName(row.name)
    setEditType(row.type)
    setErr(null)
    setEditOpen(true)
  }

  const openDelete = (row: Row) => {
    setSelected(row)
    setErr(null)
    setDeleteOpen(true)
  }

  const onConfirmEdit = async () => {
    if (!selected) return
    try {
      const nextName = editName.trim()
      if (!nextName) return

      setMutating(true)
      setErr(null)

      await updateCanonicalField(IMPORT_TYPE, selected.name, {
        name: nextName,
        type: editType,
      })

      setEditOpen(false)
      setSelected(null)
      await load()
    } catch (e: any) {
      setErr(e?.message ?? "Error updating field")
    } finally {
      setMutating(false)
    }
  }

  const onConfirmDelete = async () => {
    if (!selected) return
    try {
      setMutating(true)
      setErr(null)
      await deleteCanonicalField(IMPORT_TYPE, selected.name)
      setDeleteOpen(false)
      setSelected(null)
      await load()
    } catch (e: any) {
      setErr(e?.message ?? "Error deleting field")
    } finally {
      setMutating(false)
    }
  }

  const nothingChanged =
    !!selected && editName.trim() === selected.name && editType === selected.type

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

          {/* ADD */}
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

          {/* LIST */}
          <div className="rounded-lg border border-border p-3 bg-card">
            <div className="font-semibold mb-2">Campos actuales</div>

            {/* Search bar */}
            <div className="mb-3">
              <label className="text-sm block mb-1">Buscar</label>
              <input
                className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm"
                placeholder="Buscar por nombre o tipo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="text-xs mt-1 text-muted-foreground">
                Mostrando {filtered.length} de {sorted.length}
              </div>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {sorted.length === 0 ? "No hay campos aún." : "No hay resultados para esa búsqueda."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filtered.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 bg-background"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs mt-1 inline-flex px-2 py-1 rounded bg-secondary text-secondary-foreground border border-border">
                        {f.type}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEdit(f)} className="gap-2" title="Editar">
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDelete(f)}
                        className="gap-2"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
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

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar campo</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              Campo actual: <span className="font-semibold">{selected?.name}</span>
            </div>

            {/* Rename */}
            <div>
              <label className="text-sm block mb-1">Nombre</label>
              <input
                className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="snake_case"
              />
              <div className="text-xs mt-1 text-muted-foreground">
                Solo letras, números y guión bajo. No puede empezar con número.
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm block mb-1">Tipo</label>
              <select
                className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm"
                value={editType}
                onChange={(e) => setEditType(e.target.value as CanonicalSqlType)}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="date">date</option>
                <option value="boolean">boolean</option>
                <option value="text">text</option>
                <option value="image">image</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={mutating}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirmEdit}
              disabled={mutating || !selected || !editName.trim() || nothingChanged}
            >
              {mutating ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>

          <div className="text-sm">
            ¿Seguro que quieres eliminar el campo <span className="font-semibold">{selected?.name}</span>? Esta acción no
            se puede deshacer.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={mutating}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={mutating || !selected}>
              {mutating ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}