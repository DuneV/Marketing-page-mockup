export interface User {
  id: string
  username: string
  empresa_campaña_actual: string
  nombre: string
  cedula: string
  unidades_productos: number
  correo: string
  fechaCreacion: string
}

export interface UserFormData {
  username: string
  empresa_campaña_actual: string
  nombre: string
  cedula: string
  unidades_productos: number
  correo: string
}
