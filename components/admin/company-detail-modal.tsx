// components\admin\company-detail-modal.tsx

"use client"

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

interface CompanyDetailModalProps {
  company: Company | null
  isOpen: boolean
  onClose: () => void
}

const sizeColors = {
  pequeño: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  mediano: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  grande: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
}

const statusColors = {
  activa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  inactiva: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

export function CompanyDetailModal({ company, isOpen, onClose }: CompanyDetailModalProps) {
  if (!company) return null

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{company.nombre}</DialogTitle>
          <DialogDescription>Información completa de la empresa</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sección: Información General */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Información General
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nombre</p>
                <p className="text-base text-slate-900 dark:text-slate-100">{company.nombre}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tamaño</p>
                <div>
                  <Badge variant="outline" className={sizeColors[company.tamaño]}>
                    {company.tamaño}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Tipo/Industria
                </p>
                <p className="text-base text-slate-900 dark:text-slate-100">{company.tipo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Estado</p>
                <div>
                  <Badge variant="outline" className={statusColors[company.estado]}>
                    {company.estado === "activa" ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Fecha de Creación
                </p>
                <p className="text-base text-slate-900 dark:text-slate-100">
                  {formatDate(company.fechaCreacion)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección: Productos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Productos</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Cantidad Total
                </p>
                <p className="text-base text-slate-900 dark:text-slate-100">
                  {company.cantidad} producto{company.cantidad !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Lista de Productos
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.productos.map((producto, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {producto}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sección: Estadísticas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Estadísticas
            </h3>
            {company.totalCampañas !== undefined || company.inversionTotal !== undefined ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Total de Campañas
                  </p>
                  <p className="text-base text-slate-900 dark:text-slate-100">
                    {company.totalCampañas ?? 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Inversión Total
                  </p>
                  <p className="text-base text-slate-900 dark:text-slate-100">
                    {formatCurrency(company.inversionTotal ?? 0)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                No hay estadísticas disponibles
              </p>
            )}
          </div>

          <Separator />

          {/* Sección: Acceso */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Acceso</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Username</p>
                <p className="text-base font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
                  {company.username}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  Contraseña oculta por seguridad
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
