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
import { assignUserToCampaign, getUser } from "@/lib/data/users"
import { getCompany } from "@/lib/data/companies"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Company } from "@/types/company"
import type { Campaign } from "@/types/campaign"

const campaignSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  empresaId: z.string().min(1, "Empresa requerida"),
  usuarioResponsableId: z.string().min(1, "Usuario responsable requerido"),
  estado: z.enum(["planificacion", "activa", "completada", "cancelada"]),
  fechaInicio: z.string().min(1, "Fecha de inicio requerida"),
  fechaFin: z.string().min(1, "Fecha fin requerida"),
  presupuesto: z.coerce.number().nonnegative("El presupuesto no puede ser negativo"),
  descripcion: z.string().min(1, "Descripción requerida"),
  objetivos: z.string().optional(),
  productosAsociados: z.string().optional(),
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

interface User {
  uid: string
  nombre: string
  role: string
}

export function EditCampaignModal({ isOpen, onClose, onSuccess, campaign, companies }: EditCampaignModalProps) {
  const [employees, setEmployees] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<{ nombre: string; empresaId: string; usuarioResponsableId: string; estado: "planificacion" | "activa" | "completada" | "cancelada"; fechaInicio: string; fechaFin: string; presupuesto: number; descripcion: string; objetivos?: string; productosAsociados: string }>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nombre: "",
      empresaId: "",
      usuarioResponsableId: "",
      estado: "planificacion",
      fechaInicio: "",
      fechaFin: "",
      presupuesto: 0,
      descripcion: "",
      objetivos: "",
      productosAsociados: "",
    },
  })

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
    }
  }, [isOpen])

  useEffect(() => {
    if (campaign) {
      form.reset({
        nombre: campaign.nombre,
        empresaId: campaign.empresaId,
        usuarioResponsableId: campaign.usuarioResponsableId,
        estado: campaign.estado,
        fechaInicio: campaign.fechaInicio,
        fechaFin: campaign.fechaFin,
        presupuesto: campaign.presupuesto,
        descripcion: campaign.descripcion,
        objetivos: campaign.objetivos || "",
        productosAsociados: campaign.productosAsociados?.join(", ") || "",
      })
    }
  }, [campaign, form])

  const loadEmployees = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "employee"))
      const snapshot = await getDocs(q)
      const employeesList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        nombre: doc.data().nombre,
        role: doc.data().role,
      }))
      setEmployees(employeesList)
    } catch (error) {
      console.error("Error cargando empleados:", error)
      toast.error("Error al cargar empleados")
    }
  }

  const handleSubmit = async (data: { nombre: string; empresaId: string; usuarioResponsableId: string; estado: "planificacion" | "activa" | "completada" | "cancelada"; fechaInicio: string; fechaFin: string; presupuesto: number; descripcion: string; objetivos?: string; productosAsociados: string }) => {
    if (!campaign) return

    setIsLoading(true)
    try {
      const productos = data.productosAsociados
        ? data.productosAsociados.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
        : []

      // Verificar si cambió el usuario responsable
      const oldUserId = campaign.usuarioResponsableId
      const newUserId = data.usuarioResponsableId
      const userChanged = oldUserId !== newUserId
      const companyChanged = campaign.empresaId !== data.empresaId

      if (userChanged) {
        // Desasignar usuario anterior
        await assignUserToCampaign(oldUserId, null)
        // Asignar nuevo usuario
        await assignUserToCampaign(newUserId, campaign.id)
      }

      // Preparar actualizaciones
      const updates: any = {
        nombre: data.nombre,
        empresaId: data.empresaId,
        usuarioResponsableId: data.usuarioResponsableId,
        estado: data.estado,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        presupuesto: data.presupuesto,
        descripcion: data.descripcion,
        objetivos: data.objetivos,
        productosAsociados: productos,
      }

      // Actualizar nombres denormalizados si cambiaron
      if (userChanged) {
        const newUser = await getUser(newUserId)
        updates.usuarioResponsableNombre = newUser?.nombre || "Usuario desconocido"
      }

      if (companyChanged) {
        const newCompany = await getCompany(data.empresaId)
        updates.empresaNombre = newCompany?.nombre || "Empresa desconocida"
      }

      // Actualizar campaña
      await updateCampaign(campaign.id, updates)

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

  if (!campaign) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Campaña</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la campaña
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
                    <FormLabel>Nombre de la Campaña</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Empresa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                name="usuarioResponsableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario Responsable</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.uid} value={employee.uid}>
                            {employee.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
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
                    <FormLabel>Fecha de Fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presupuesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presupuesto (COP)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
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
                    <Textarea rows={2} {...field} />
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
                    <Textarea rows={2} {...field} />
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
                {isLoading ? "Actualizando..." : "Actualizar Campaña"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
