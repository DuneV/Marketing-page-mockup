export type UserRole = "admin" | "company" | "employee"

export interface User {
  id: string
  username: string
  nombre: string
  cedula: string
  correo: string
  role: UserRole
  empresaActualId?: string | null
  empresaActualNombre?: string | null
  campanaActualId?: string | null
  campanaActualNombre?: string | null
  unidadesProductos: number
  createdAt: string
  updatedAt?: string
}

export interface UserFormData {
  username: string
  nombre: string
  cedula: string
  correo: string
  role: UserRole
  empresaActualId?: string | null
  empresaActualNombre?: string | null
  unidadesProductos: number
}
