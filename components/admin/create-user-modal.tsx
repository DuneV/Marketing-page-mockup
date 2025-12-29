"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { getAllCompanies } from "@/lib/data/companies"
import type { UserFormData, UserRole } from "@/types/user"
import type { Company } from "@/types/company"

const userSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres"),
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  cedula: z.string().min(6, "Mínimo 6 caracteres"),
  correo: z.string().email("Correo inválido"),
  role: z.enum(["admin", "employee", "company"], { required_error: "Selecciona un rol" }),
  empresaActualId: z.string().nullable().optional(),
  unidadesProductos: z.coerce.number().min(0, "Debe ser un número positivo"),
})

type FormValues = z.infer<typeof userSchema>

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (user: UserFormData) => void
}

export function CreateUserModal({ isOpen, onClose, onSubmit }: CreateUserModalProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      nombre: "",
      cedula: "",
      correo: "",
      role: "employee",
      empresaActualId: null,
      unidadesProductos: 0,
    },
  })

  useEffect(() => {
    if (isOpen) {
      setIsLoadingCompanies(true)
      getAllCompanies()
        .then(setCompanies)
        .catch(console.error)
        .finally(() => setIsLoadingCompanies(false))
    }
  }, [isOpen])

  const handleSubmit = (data: FormValues) => {
    const selectedCompany = companies.find((c) => c.id === data.empresaActualId)
    const userData: UserFormData = {
      username: data.username,
      nombre: data.nombre,
      cedula: data.cedula,
      correo: data.correo,
      role: data.role as UserRole,
      empresaActualId: data.empresaActualId || null,
      empresaActualNombre: selectedCompany?.nombre || null,
      unidadesProductos: data.unidadesProductos,
    }
    onSubmit(userData)
    form.reset()
    onClose()
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogDescription>Completa el formulario para crear un nuevo usuario interno</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="nombre.apellido" {...field} />
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
                    <FormLabel>Cédula</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="usuario@marketing.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Empleado</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="empresaActualId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa Asignada</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={isLoadingCompanies}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCompanies ? "Cargando..." : "Seleccionar empresa"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
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

            <FormField
              control={form.control}
              name="unidadesProductos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidades de Productos</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
