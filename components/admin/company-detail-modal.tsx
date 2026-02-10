// components/admin/company-detail-modal.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import type { Company } from "@/types/company"
import { getCompany, updateCompanySql } from "@/lib/data/companies"

interface CompanyDetailModalProps {
  company: Company | null
  isOpen: boolean
  onClose: () => void
  onUpdated?: () => void
}

const sizeColors: Record<string, string> = {
  pequeño: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  mediano: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  grande: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
}

const statusColors: Record<string, string> = {
  activa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  inactiva: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

export function CompanyDetailModal({ company, isOpen, onClose, onUpdated }: CompanyDetailModalProps) {
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detail, setDetail] = useState<Company | null>(null)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Empresa
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState("")
  const [formSize, setFormSize] = useState("mediano")
  const [formStatus, setFormStatus] = useState("activa")
  const [formProductsCsv, setFormProductsCsv] = useState("")
  const [formNit, setFormNit] = useState("")

  // Usuario ligado
  const [userNombre, setUserNombre] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userCedula, setUserCedula] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Cargar detalle fresco al abrir modal
  const companyId = company?.id?.trim()
  const canFetch = Boolean(isOpen && companyId && companyId !== "undefined" && companyId !== "null")

  useEffect(() => {
    if (!canFetch) return

    setEditing(false)
    setSaving(false)
    setLoadingDetail(true)
    setDetail(null)

    ;(async () => {
      try {
        const fresh = await getCompany(companyId!) // ya validado
        setDetail(fresh)
      } catch (e: any) {
        toast.error(e?.message ?? "No se pudo cargar detalle")
        setDetail(company) // fallback
      } finally {
        setLoadingDetail(false)
      }
    })()
  }, [canFetch, companyId])

  // Poblar form con detail (o fallback company)
  useEffect(() => {
    if (!isOpen) return
    const c = detail ?? company
    if (!c) return

    setFormName(c.nombre ?? "")
    setFormType(c.tipo ?? "")
    setFormSize(c.tamaño ?? "mediano")
    setFormStatus(c.estado ?? "activa")
    setFormProductsCsv((c.productos ?? []).join(", "))
    setFormNit((c.nit ?? "") as any)

    setUserNombre(c.user?.nombre ?? "")
    setUserEmail(c.user?.email ?? "")
    setUserCedula(c.user?.cedula ?? "")

    setNewPassword("")
    setConfirmPassword("")
  }, [isOpen, detail?.id])

  const parsedProducts = useMemo(() => {
    return (formProductsCsv ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
  }, [formProductsCsv])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const resetForm = () => {
    const c = detail ?? company
    if (!c) return

    setFormName(c.nombre ?? "")
    setFormType(c.tipo ?? "")
    setFormSize(c.tamaño ?? "mediano")
    setFormStatus(c.estado ?? "activa")
    setFormProductsCsv((c.productos ?? []).join(", "))
    setFormNit((c.nit ?? "") as any)

    setUserNombre(c.user?.nombre ?? "")
    setUserEmail(c.user?.email ?? "")
    setUserCedula(c.user?.cedula ?? "")

    setNewPassword("")
    setConfirmPassword("")
  }

  const onSave = async () => {
    const c = detail ?? company
    if (!c) return

    const name = formName.trim()
    const type = formType.trim()
    const email = userEmail.trim().toLowerCase()

    if (!name || !type) {
      toast.error("Nombre y Tipo/Industria son obligatorios")
      return
    }

    // ✅ normalizar actuales para comparar bien
    const currentEmail = (c.user?.email ?? "").trim().toLowerCase()
    const currentNombre = (c.user?.nombre ?? "").trim()
    const currentCedula = (c.user?.cedula ?? "").trim()

    const hasUserEdit =
      userNombre.trim() !== currentNombre ||
      email !== currentEmail ||
      userCedula.trim() !== currentCedula ||
      !!newPassword.trim()

    if (hasUserEdit && !c.user?.uid) {
      toast.error("Esta empresa no tiene usuario ligado (NO_LINKED_USER)")
      return
    }

    if (newPassword.trim()) {
      if (newPassword.trim().length < 8) {
        toast.error("La contraseña debe tener mínimo 8 caracteres")
        return
      }
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas no coinciden")
        return
      }
    }

    try {
      setSaving(true)

      // ✅ AQUÍ es donde reemplazas el bloque
      await updateCompanySql(c.id, {
        name,
        type,
        size: formSize,
        status: formStatus,
        products: parsedProducts,
        nit: formNit.trim() ? formNit.trim() : null,
        user: hasUserEdit
          ? {
              // uid es opcional; si tu backend lo ignora, lo puedes quitar
              uid: c.user?.uid ?? undefined,
              nombre: userNombre.trim() ? userNombre.trim() : undefined,
              email: email ? email : undefined,
              cedula: userCedula.trim() ? userCedula.trim() : undefined,
              password: newPassword.trim() ? newPassword.trim() : undefined,
            }
          : undefined,
      })

      toast.success("Empresa actualizada")
      setEditing(false)
      setNewPassword("")
      setConfirmPassword("")

      // recarga detalle + lista
      const fresh = await getCompany(c.id)
      setDetail(fresh)
      onUpdated?.()
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar cambios")
    } finally {
      setSaving(false)
    }
  }

  if (!company) return null
  const c = detail ?? company

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        if (editing) {
          setEditing(false)
          resetForm()
        }
        onClose()
      }}
    >
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{editing ? "Editar empresa" : c.nombre}</DialogTitle>
          <DialogDescription>
            {loadingDetail
              ? "Cargando detalle..."
              : editing
                ? "Modo Edición de empresa"
                : "Información completa de la empresa"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Empresa</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nombre</p>
                {editing ? (
                  <input
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                ) : (
                  <p className="text-base text-slate-900 dark:text-slate-100">{c.nombre}</p>
                )}
              </div>

              {/* NIT */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">NIT</p>
                {editing ? (
                  <input
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                    value={formNit}
                    onChange={(e) => setFormNit(e.target.value)}
                    placeholder="ej: 900123456-7"
                  />
                ) : (
                  <p className="text-base text-slate-900 dark:text-slate-100">{c.nit ?? "—"}</p>
                )}
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tipo/Industria</p>
                {editing ? (
                  <input
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                  />
                ) : (
                  <p className="text-base text-slate-900 dark:text-slate-100">{c.tipo}</p>
                )}
              </div>

              {/* Tamaño */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tamaño</p>
                {editing ? (
                  <select
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                  >
                    <option value="pequeño">pequeño</option>
                    <option value="mediano">mediano</option>
                    <option value="grande">grande</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                ) : (
                  <Badge variant="outline" className={sizeColors[c.tamaño] ?? ""}>
                    {c.tamaño}
                  </Badge>
                )}
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Estado</p>
                {editing ? (
                  <select
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="activa">activa</option>
                    <option value="inactiva">inactiva</option>
                  </select>
                ) : (
                  <Badge variant="outline" className={statusColors[c.estado] ?? ""}>
                    {c.estado === "activa" ? "Activa" : "Inactiva"}
                  </Badge>
                )}
              </div>

              {/* Fecha */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de creación</p>
                <p className="text-base text-slate-900 dark:text-slate-100">{formatDate(c.fechaCreacion)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Productos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Productos</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cantidad Total</p>
                <p className="text-base text-slate-900 dark:text-slate-100">
                  {(editing ? parsedProducts.length : c.cantidad) ?? 0} producto
                  {((editing ? parsedProducts.length : c.cantidad) ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Lista</p>

                {editing ? (
                  <textarea
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm min-h-[90px]"
                    value={formProductsCsv}
                    onChange={(e) => setFormProductsCsv(e.target.value)}
                    placeholder="Producto1, Producto2, Producto3"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(c.productos ?? []).map((producto, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {producto}
                      </Badge>
                    ))}
                    {(c.productos ?? []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Usuario ligado */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Usuario (Empresa)</h3>

            {!c.user?.uid ? (
              <p className="text-sm text-muted-foreground">
                Esta empresa no tiene usuario ligado en <code className="px-1">marketing.company_users</code>.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nombre</p>
                  {editing ? (
                    <input
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                      value={userNombre}
                      onChange={(e) => setUserNombre(e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-slate-900 dark:text-slate-100">{c.user?.nombre ?? "—"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cédula</p>
                  {editing ? (
                    <input
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                      value={userCedula}
                      onChange={(e) => setUserCedula(e.target.value)}
                    />
                  ) : (
                    <p className="text-base text-slate-900 dark:text-slate-100">{c.user?.cedula ?? "—"}</p>
                  )}
                </div>

                <div className="space-y-1 col-span-2">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</p>
                  {editing ? (
                    <input
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="empresa@dominio.com"
                    />
                  ) : (
                    <p className="text-base font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
                      {c.user?.email ?? "—"}
                    </p>
                  )}
                </div>

                {editing ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nueva contraseña</p>
                      <input
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="mín. 8 caracteres"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Confirmar contraseña</p>
                      <input
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="repite la contraseña"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground col-span-2">
                      Si dejas la contraseña vacía, no se cambia.
                    </p>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <Separator />

          {/* Stats */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Campañas</p>
                <p className="text-base text-slate-900 dark:text-slate-100">{c.totalCampañas ?? 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inversión Total</p>
                <p className="text-base text-slate-900 dark:text-slate-100">{formatCurrency(c.inversionTotal ?? 0)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Acceso */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Acceso</h3>
            <p className="text-xs text-muted-foreground">
              Username se mantiene como referencia (no afecta el login de Firebase).
            </p>
            <p className="text-base font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
              {c.username}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setEditing(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={onSave}
                disabled={
                  saving ||
                  !formName.trim() ||
                  !formType.trim() ||
                  (!!newPassword.trim() && newPassword.trim().length < 8)
                }
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button type="button" onClick={() => setEditing(true)} disabled={loadingDetail}>
                Editar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}