// lib/data/companies.ts
import type { Company } from "@/types/company"
import {
  apiGetAllCompanies,
  apiCreateCompanyWithUser,
  apiDeleteCompany,
  apiGetCompany,
  apiUpdateCompanyCampaignStats,
  apiDecrementCompanyCampaignCount,
  apiUpdateCompanySql,
} from "@/lib/api/companiesApi"

const toSafeNumber = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0
  const num = typeof value === "number" ? value : parseFloat(value)
  return Number.isFinite(num) ? num : 0
}

function toArrayString(v: any): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function mapCompany(c: any): Company {
  const products = toArrayString(c.products ?? c.productos ?? c.products_json ?? c.productsJson ?? c.productsJSON)
  const quantity = toSafeNumber(c.quantity ?? c.cantidad ?? products.length)

  return {
    id: c.id ?? c.companyId ?? c.company_id,
    nombre: c.name ?? c.nombre ?? "",
    tamaño: c.size ?? c.tamaño ?? c.tamano ?? "mediano",
    tipo: c.type ?? c.tipo ?? "",
    productos: products,
    cantidad: quantity,
    nit: c.nit ?? null,

    username: c.username ?? "",
    contraseña: "••••••••",

    estado: (c.status ?? c.estado ?? "activa") as any,
    fechaCreacion: c.fechaCreacion ?? c.createdAt ?? c.created_at ?? new Date().toISOString(),

    totalCampañas: toSafeNumber(c.total_campaigns ?? c.totalCampañas),
    inversionTotal: toSafeNumber(c.total_investment ?? c.inversionTotal),

    user: c.user ?? null,
  }
}

export async function getAllCompanies(): Promise<Company[]> {
  const data = await apiGetAllCompanies()
  const rows = Array.isArray(data) ? data : Array.isArray((data as any)?.companies) ? (data as any).companies : []
  return rows.map(mapCompany)
}

export async function createCompanyWithUser(payload: any) {
  return apiCreateCompanyWithUser(payload)
}

export async function deleteCompany(companyId: string): Promise<void> {
  await apiDeleteCompany(companyId)
}

export async function decrementCompanyCampaignCount(companyId: string, budget?: number): Promise<void> {
  await apiDecrementCompanyCampaignCount(companyId, Math.abs(budget ?? 0))
}

export async function getCompany(companyId: string): Promise<Company | null> {
  if (!companyId) return null
  const data = await apiGetCompany(companyId)
  // backend ahora devuelve { company, user }
  const company = (data as any)?.company ?? data
  if (!company) return null
  return mapCompany({
    ...company,
    user: (data as any)?.user ?? null,
  })
}

export async function incrementCompanyCampaignCount(companyId: string, budget?: number): Promise<void> {
  await apiUpdateCompanyCampaignStats(companyId, {
    deltaCampaigns: 1,
    deltaBudget: Math.abs(budget ?? 0),
  })
}

export async function updateCompanySql(
  companyId: string,
  patch: {
    name?: string
    type?: string
    size?: string
    status?: string
    products?: string[]
    nit?: string | null
    user?: {
      uid?: string
      email?: string
      password?: string
      nombre?: string
      cedula?: string
    }
  }
) {
  return apiUpdateCompanySql(companyId, patch)
}