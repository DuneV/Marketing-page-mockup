export type CompanySize = "pequeño" | "mediano" | "grande" | "enterprise"
export type CompanyStatus = "activa" | "inactiva"

export interface CompanyUserInfo {
  uid?: string | null
  email?: string | null
  nombre?: string | null
  cedula?: string | null
}

export interface Company {
  id: string
  nombre: string
  tamaño: CompanySize
  tipo: string
  productos: string[]
  cantidad: number

  // NEW: nit/cedula empresa (si lo guardas en SQL)
  nit?: string | null

  username: string
  contraseña: string
  estado: CompanyStatus
  fechaCreacion: string
  totalCampañas?: number
  inversionTotal?: number

  // NEW: user ligado (firebase)
  user?: CompanyUserInfo | null
}

export interface CompanyFormData {
  nombre: string
  tipo: string
  tamaño: CompanySize
  productos: string
  cantidad: number

  // NEW
  nit?: string

  username: string
  contraseña: string
  estado: CompanyStatus
}

export interface CompanyUserFormData {
  uid?: string
  nombre: string
  email: string
  cedula: string
  password?: string // solo para setear nueva, no se “lee”
}