import type { Company } from "@/types/company"

const STORAGE_KEY = "companies"

const initialCompanies: Company[] = [
  {
    id: crypto.randomUUID(),
    nombre: "Distribuidora Central",
    tamaño: "grande",
    tipo: "Distribución",
    productos: ["Águila", "Poker", "Club Colombia"],
    cantidad: 3,
    username: "distcentral",
    contraseña: "password123",
    estado: "activa",
    fechaCreacion: new Date("2024-01-15").toISOString(),
    totalCampañas: 24,
    inversionTotal: 450000,
  },
  {
    id: crypto.randomUUID(),
    nombre: "SuperMercados del Norte",
    tamaño: "mediano",
    tipo: "Retail",
    productos: ["Águila", "Poker"],
    cantidad: 2,
    username: "supernorte",
    contraseña: "password123",
    estado: "activa",
    fechaCreacion: new Date("2024-03-10").toISOString(),
    totalCampañas: 15,
    inversionTotal: 280000,
  },
  {
    id: crypto.randomUUID(),
    nombre: "Comercializadora Express",
    tamaño: "pequeño",
    tipo: "Comercio",
    productos: ["Águila"],
    cantidad: 1,
    username: "comexpress",
    contraseña: "password123",
    estado: "activa",
    fechaCreacion: new Date("2024-05-20").toISOString(),
    totalCampañas: 8,
    inversionTotal: 120000,
  },
  {
    id: crypto.randomUUID(),
    nombre: "Grupo Empresarial Bavaria",
    tamaño: "enterprise",
    tipo: "Corporativo",
    productos: ["Águila", "Poker", "Club Colombia", "Budweiser"],
    cantidad: 4,
    username: "gebavaria",
    contraseña: "password123",
    estado: "activa",
    fechaCreacion: new Date("2023-11-01").toISOString(),
    totalCampañas: 42,
    inversionTotal: 850000,
  },
  {
    id: crypto.randomUUID(),
    nombre: "Tiendas la Esquina",
    tamaño: "pequeño",
    tipo: "Retail",
    productos: ["Poker"],
    cantidad: 1,
    username: "laesquina",
    contraseña: "password123",
    estado: "inactiva",
    fechaCreacion: new Date("2024-02-14").toISOString(),
    totalCampañas: 3,
    inversionTotal: 45000,
  },
]

export const CompaniesStorage = {
  initialize: (): void => {
    if (typeof window === "undefined") return

    const existing = localStorage.getItem(STORAGE_KEY)
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCompanies))
    }
  },

  getAll: (): Company[] => {
    if (typeof window === "undefined") return []

    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },

  getById: (id: string): Company | null => {
    const companies = CompaniesStorage.getAll()
    return companies.find((c) => c.id === id) || null
  },

  create: (company: Omit<Company, "id" | "fechaCreacion">): Company => {
    const companies = CompaniesStorage.getAll()
    const newCompany: Company = {
      ...company,
      id: crypto.randomUUID(),
      fechaCreacion: new Date().toISOString(),
      totalCampañas: company.totalCampañas || 0,
      inversionTotal: company.inversionTotal || 0,
    }
    companies.push(newCompany)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
    return newCompany
  },

  delete: (id: string): boolean => {
    const companies = CompaniesStorage.getAll()
    const filtered = companies.filter((c) => c.id !== id)
    if (filtered.length < companies.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      return true
    }
    return false
  },
}
