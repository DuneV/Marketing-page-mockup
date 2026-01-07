// components/admin/create-company-modal.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { z } from "zod"

const tamaños = ["pequeño", "mediano", "grande", "enterprise"] as const

const createCompanyWithUserSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  tipo: z.string().min(2, "Tipo requerido"),
  tamaño: z.enum(tamaños, { message: "Selecciona un tamaño" }),

  // ✅ productos como lista real
  productos: z
    .string()
    .transform((s) => s.split(",").map((p) => p.trim()).filter(Boolean))
    .refine((arr) => arr.length > 0, "Al menos un producto"),

  cantidad: z.coerce.number().min(0, "Debe ser un número positivo"),
  username: z.string().min(3, "Mínimo 3 caracteres").optional().default(""),
  estado: z.enum(["activa", "inactiva"]),

  userNombre: z.string().min(2, "Nombre requerido"),
  userEmail: z.string().email("Email inválido"),
  userPassword: z.string().min(8, "Mínimo 8 caracteres"),
  cedula: z.string().optional().default(""),
})

export type CreateCompanyWithUserFormData = z.infer<typeof createCompanyWithUserSchema>

export type CreateCompanyWithUserPayload = {
  company: {
    nombre: string
    tipo: string
    tamaño?: string
    estado?: "activa" | "inactiva"
    productos?: string[]
    cantidad?: number
    username?: string
    totalCampañas?: number
    inversionTotal?: number
  }
  user: {
    email: string
    password: string
    nombre: string
    cedula?: string
  }
}

interface CreateCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateCompanyWithUserPayload) => Promise<void> | void
}

export function CreateCompanyModal({ isOpen, onClose, onSubmit }: CreateCompanyModalProps) {
  const form = useForm<CreateCompanyWithUserFormData>({
    resolver: zodResolver(createCompanyWithUserSchema),
    defaultValues: {
      nombre: "",
      tipo: "",
      tamaño: "mediano",
      productos: "" as any, // porque en schema entra string pero sale string[]
      cantidad: 0,
      username: "",
      estado: "activa",

      userNombre: "",
      userEmail: "",
      userPassword: "",
      cedula: "",
    },
  })

  const handleValidSubmit = async (data: CreateCompanyWithUserFormData) => {
    // ✅ aquí data.productos ya es string[]
    const payload: CreateCompanyWithUserPayload = {
      company: {
        nombre: data.nombre,
        tipo: data.tipo,
        tamaño: data.tamaño,
        productos: data.productos,
        cantidad: data.cantidad,
        username: data.username?.trim() ? data.username.trim() : undefined,
        estado: data.estado,
        totalCampañas: 0,
        inversionTotal: 0,
      },
      user: {
        nombre: data.userNombre,
        email: data.userEmail,
        password: data.userPassword,
        cedula: data.cedula?.trim() ? data.cedula.trim() : undefined,
      },
    }

    try {
      await onSubmit(payload)
      form.reset()
      onClose()
    } catch (e: any) {
      // ✅ NO cerrar modal si falla API
      console.error("Create company failed:", e)
      toast.error(e?.message ?? "Error al crear empresa")
    }
  }

  const handleInvalidSubmit = () => {
    // ✅ evita “no pasa nada”
    toast.error("Revisa los campos marcados en rojo")
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Empresa</DialogTitle>
          <DialogDescription>Completa el formulario para crear una nueva empresa cliente</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)} className="space-y-6">
            {/* Empresa */}
            <div className="space-y-3">
              <h3 className="font-semibold">Datos de la empresa</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la empresa" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo/Industria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Distribución, Retail" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tamaño"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamaño</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tamaño" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pequeño">Pequeño</SelectItem>
                          <SelectItem value="mediano">Mediano</SelectItem>
                          <SelectItem value="grande">Grande</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cantidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad de Productos</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} value={(field.value ?? 0) as any} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="productos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Productos (separados por coma)</FormLabel>
                    <FormControl>
                      {/* field.value aquí puede ser string[] (post-transform), así que lo mostramos como string */}
                      <Textarea
                        placeholder="Ej: Águila, Poker, Club Colombia"
                        rows={2}
                        {...field}
                        value={Array.isArray(field.value) ? field.value.join(", ") : (field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Usuario interno (opcional)" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="activa" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Activa</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="inactiva" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Inactiva</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Usuario */}
            <div className="space-y-3">
              <h3 className="font-semibold">Usuario de acceso (Empresa)</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userNombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del responsable" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cedula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cédula (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Documento" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="empresa@dominio.com" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="mín. 8 caracteres" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                Crear Empresa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
