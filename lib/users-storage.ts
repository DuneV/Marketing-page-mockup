import type { User } from "@/types/user"

const STORAGE_KEY = "users"

const initialUsers: User[] = [
  {
    id: crypto.randomUUID(),
    username: "jrodriguez",
    empresa_campaña_actual: "Distribuidora Central",
    nombre: "Juan Rodríguez",
    cedula: "1234567890",
    unidades_productos: 150,
    correo: "juan.rodriguez@marketing.com",
    fechaCreacion: new Date("2024-01-15").toISOString(),
  },
  {
    id: crypto.randomUUID(),
    username: "mgarcia",
    empresa_campaña_actual: "SuperMercados del Norte",
    nombre: "María García",
    cedula: "9876543210",
    unidades_productos: 85,
    correo: "maria.garcia@marketing.com",
    fechaCreacion: new Date("2024-02-20").toISOString(),
  },
  {
    id: crypto.randomUUID(),
    username: "cmartinez",
    empresa_campaña_actual: "Grupo Empresarial Bavaria",
    nombre: "Carlos Martínez",
    cedula: "5556667778",
    unidades_productos: 320,
    correo: "carlos.martinez@marketing.com",
    fechaCreacion: new Date("2024-03-10").toISOString(),
  },
]

export const UsersStorage = {
  initialize: (): void => {
    if (typeof window === "undefined") return

    const existing = localStorage.getItem(STORAGE_KEY)
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUsers))
    }
  },

  getAll: (): User[] => {
    if (typeof window === "undefined") return []

    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },

  getById: (id: string): User | null => {
    const users = UsersStorage.getAll()
    return users.find((u) => u.id === id) || null
  },

  create: (user: Omit<User, "id" | "fechaCreacion">): User => {
    const users = UsersStorage.getAll()
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      fechaCreacion: new Date().toISOString(),
    }
    users.push(newUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
    return newUser
  },

  delete: (id: string): boolean => {
    const users = UsersStorage.getAll()
    const filtered = users.filter((u) => u.id !== id)
    if (filtered.length < users.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      return true
    }
    return false
  },
}
