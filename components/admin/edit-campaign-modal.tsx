// components/admin/edit-campaign-modal.tsx

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateCampaign } from "@/lib/data/campaigns"
import { getCompany } from "@/lib/data/companies"
import { toast } from "sonner"
import type { Campaign } from "@/types/campaign"
import type { Company } from "@/types/company"

const campaignSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  empresaId: z.string().min(1, "Empresa requerida"),
  estado: z.enum(["planificacion", "activa", "completada", "cancelada"]),
  fechaInicio: z.string().min(1, "Fecha de inicio requerida"),
  fechaFin: z.string().min(1, "Fecha fin requerida"),
  presupuesto: z.coerce.number().nonnegative("El presupuesto no puede ser negativo"),
  descripcion: z.string().min(1, "Descripción requerida"),
  objetivos: z.string().optional(),
  productosAsociados: z.string().optional(),
  bucketPath: z.string().optional(),
}).refine((data) => {
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio)
  }
  return true
}, {
  message: "La fecha fin debe ser posterior a la fecha de inicio",
  path: ["fechaFin"],
})

interface EditCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  campaign: Campaign | null
  companies: Company[]
}

export function EditCampaignModal({ isOpen, onClose, onSuccess, campaign, companies }: EditCampaignModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<{
    nombre: string
    empresaId: string
    estado: "planificacion" | "activa" | "completada" | "cancelada"
    fechaInicio: string
    fechaFin: string
    presupuesto: number
    descripcion: string
    objetivos?: string
    productosAsociados: string
    bucketPath?: string
  }>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nombre: "",
      empresaId: "",
      estado: "planificacion",
      fechaInicio: "",
      fechaFin: "",
      presupuesto: 0,
      descripcion: "",
      objetivos: "",
      productosAsociados: "",
      bucketPath: "",
    },
  })

  useEffect(() => {
    if (campaign && isOpen) {
      form.reset({
        nombre: campaign.nombre,
        empresaId: campaign.empresaId,
        estado: campaign.estado,
        fechaInicio: campaign.fechaInicio,
        fechaFin: campaign.fechaFin,
        presupuesto: campaign.presupuesto,
        descripcion: campaign.descripcion,
        objetivos: campaign.objetivos || "",
        productosAsociados: campaign.productosAsociados.join(", "),
        bucketPath: campaign.bucketPath || "",
      })
    }
  }, [campaign, isOpen, form])

  const handleSubmit = async (data: {
    nombre: string
    empresaId: string
    estado: "planificacion" | "activa" | "completada" | "cancelada"
    fechaInicio: string
    fechaFin: string
    presupuesto: number
    descripcion: string
    objetivos?: string
    productosAsociados: string
    bucketPath?: string
  }) => {
    if (!campaign) return

    setIsLoading(true)
    try {
      // Parsear productos asociados
      const productos = data.productosAsociados
        ? data.productosAsociados.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
        : []

      // Obtener nombre de empresa si cambió
      let empresaNombre = campaign.empresaNombre
      if (data.empresaId !== campaign.empresaId) {
        const selectedCompany = await getCompany(data.empresaId)
        empresaNombre = selectedCompany?.nombre || "Empresa desconocida"
      }

      // Actualizar campaña
      await updateCampaign(campaign.id, {
        nombre: data.nombre,
        empresaId: data.empresaId,
        empresaNombre,
        estado: data.estado,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        presupuesto: Number(data.presupuesto),
        descripcion: data.descripcion,
        objetivos: data.objetivos,
        productosAsociados: productos,
        bucketPath: data.bucketPath?.trim() || campaign.bucketPath,
      })

      toast.success("Campaña actualizada", {
        description: `${data.nombre} ha sido actualizada exitosamente`,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error actualizando campaña:", error)
      toast.error("Error al actualizar campaña")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Campaña</DialogTitle>
          <DialogDescription>
            Modifica los datos de la campaña
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Campaña *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Campaña Verano 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="empresaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planificacion">Planificación</SelectItem>
                        <SelectItem value="activa">Activa</SelectItem>
                        <SelectItem value="completada">Completada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presupuesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presupuesto (COP) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Fin *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bucketPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruta del Bucket</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="campaigns/empresa123/verano2025" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Ruta donde se almacenan los archivos de la campaña en GCS
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe la campaña y sus características principales"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objetivos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Objetivos y metas de la campaña"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productosAsociados"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Productos Asociados (separados por coma)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Águila, Poker, Club Colombia"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}