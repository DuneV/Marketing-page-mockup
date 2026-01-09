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
import { FormFieldWithValidation } from "@/components/ui/form-field-with-validation"
import { getAllCompanies, getCompany } from "@/lib/data/companies"
import { checkEmailExists, checkUsernameExists } from "@/lib/validation/check-duplicates"
import type { UserFormData, UserRole } from "@/types/user"
import type { Company } from "@/types/company"
import { X, Plus } from "lucide-react"

const userSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres"),
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  cedula: z.string().min(6, "Mínimo 6 caracteres"),
  correo: z.string().email("Correo inválido"),
  role: z.enum(["admin", "employee", "company"]),
  empresaActualId: z.string().nullable().optional(),
  unidadesProductos: z.record(z.string(), z.number().int().nonnegative()).default({}),
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
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [productQuantity, setProductQuantity] = useState<number>(0)

  const form = useForm<FormValues>({
    resolver: zodResolver(userSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      username: "",
      nombre: "",
      cedula: "",
      correo: "",
      role: "employee",
      empresaActualId: null,
      unidadesProductos: {},
    },
  })

  const empresaActualId = form.watch("empresaActualId")
  const unidadesProductos = form.watch("unidadesProductos")

  useEffect(() => {
    if (isOpen) {
      setIsLoadingCompanies(true)
      getAllCompanies()
        .then(setCompanies)
        .catch(console.error)
        .finally(() => setIsLoadingCompanies(false))
    }
  }, [isOpen])

  // Cargar productos cuando se selecciona una empresa
  useEffect(() => {
    const loadCompanyProducts = async () => {
      if (empresaActualId && empresaActualId !== "none") {
        try {
          const company = await getCompany(empresaActualId)
          if (company && company.productos) {
            setAvailableProducts(company.productos)
          } else {
            setAvailableProducts([])
          }
        } catch (error) {
          console.error("Error loading company products:", error)
          setAvailableProducts([])
        }
      } else {
        setAvailableProducts([])
        // Limpiar productos cuando no hay empresa
        form.setValue("unidadesProductos", {})
      }
      // Reset selector
      setSelectedProduct("")
      setProductQuantity(0)
    }

    loadCompanyProducts()
  }, [empresaActualId, form])

  const handleAddProduct = () => {
    if (!selectedProduct || productQuantity <= 0) return

    const currentProducts = form.getValues("unidadesProductos")
    form.setValue("unidadesProductos", {
      ...currentProducts,
      [selectedProduct]: productQuantity,
    })

    setSelectedProduct("")
    setProductQuantity(0)
  }

  const handleRemoveProduct = (productName: string) => {
    const currentProducts = form.getValues("unidadesProductos")
    const updated = { ...currentProducts }
    delete updated[productName]
    form.setValue("unidadesProductos", updated)
  }

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
    setAvailableProducts([])
    setSelectedProduct("")
    setProductQuantity(0)
    onClose()
  }

  const handleClose = () => {
    form.reset()
    setAvailableProducts([])
    setSelectedProduct("")
    setProductQuantity(0)
    onClose()
  }

  // Productos disponibles que no han sido agregados
  const productsToAdd = availableProducts.filter(
    (product) => !Object.keys(unidadesProductos).includes(product)
  )

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
              <FormFieldWithValidation
                control={form.control}
                name="username"
                label="Usuario"
                placeholder="nombre.apellido"
                required
                helpText="Mínimo 3 caracteres"
              />

              <FormFieldWithValidation
                control={form.control}
                name="cedula"
                label="Cédula"
                placeholder="1234567890"
                required
                helpText="Mínimo 6 caracteres"
              />
            </div>

            <FormFieldWithValidation
              control={form.control}
              name="nombre"
              label="Nombre Completo"
              placeholder="Juan Pérez"
              required
              helpText="Mínimo 2 caracteres"
            />

            <FormFieldWithValidation
              control={form.control}
              name="correo"
              label="Correo Electrónico"
              type="email"
              placeholder="usuario@marketing.com"
              required
              helpText="Email válido requerido"
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

            {/* Selector de Productos */}
            <div className="space-y-3">
              <FormLabel>Unidades de Productos</FormLabel>

              {!empresaActualId || empresaActualId === "none" ? (
                <p className="text-sm text-muted-foreground">
                  Selecciona una empresa para asignar productos
                </p>
              ) : availableProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  La empresa seleccionada no tiene productos disponibles
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Agregar producto */}
                  <div className="flex gap-2">
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                      disabled={productsToAdd.length === 0}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue
                          placeholder={
                            productsToAdd.length === 0
                              ? "Todos los productos agregados"
                              : "Seleccionar producto"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {productsToAdd.map((product) => (
                          <SelectItem key={product} value={product}>
                            {product}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={1}
                      placeholder="Cantidad"
                      value={productQuantity || ""}
                      onChange={(e) => setProductQuantity(parseInt(e.target.value) || 0)}
                      className="w-32"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddProduct}
                      disabled={!selectedProduct || productQuantity <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Lista de productos agregados */}
                  {Object.keys(unidadesProductos).length > 0 && (
                    <div className="border rounded-md p-3 space-y-2">
                      <p className="text-sm font-medium">Productos asignados:</p>
                      {Object.entries(unidadesProductos).map(([productName, quantity]) => (
                        <div
                          key={productName}
                          className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                        >
                          <span className="text-sm font-medium">{productName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {quantity} unidades
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProduct(productName)}
                              className="h-6 w-6 p-0 hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <p className="text-sm font-semibold">
                          Total: {Object.values(unidadesProductos).reduce((sum, qty) => sum + qty, 0)} unidades
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
