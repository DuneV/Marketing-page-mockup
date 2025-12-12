export interface Company {
  id: string
  nombre: string
  tamaño: CompanySize
  tipo: string
  productos: string[]
  cantidad: number
  username: string
  contraseña: string
  estado: CompanyStatus
  fechaCreacion: string
  totalCampañas?: number
  inversionTotal?: number
}

export type CompanySize = "pequeño" | "mediano" | "grande" | "enterprise"
export type CompanyStatus = "activa" | "inactiva"

export interface CompanyFormData {
  nombre: string
  tipo: string
  tamaño: CompanySize
  productos: string
  cantidad: number
  username: string
  contraseña: string
  estado: CompanyStatus
}
