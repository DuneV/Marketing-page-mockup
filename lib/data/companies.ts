// lib/data/companies.ts
import type { Company } from "@/types/company"
import {
  apiGetAllCompanies,
  apiCreateCompanyWithUser,
  apiDeleteCompany,
  apiGetCompany,
  apiUpdateCompanyCampaignStats,
  apiDecrementCompanyCampaignCount,
} from "@/lib/api/companiesApi"

// Helper para convertir valores a números seguros
const toSafeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0
  const num = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(num) ? 0 : num
}

// Helper para mapear una empresa desde la API
function mapCompany(c: any): Company {
  return {
    id: c.id ?? c.companyId ?? c.company_id,
    nombre: c.name ?? c.nombre,
    tamaño: c.size ?? c.tamaño ?? c.tamano ?? "mediano",
    tipo: c.type ?? c.tipo ?? "",
    productos: Array.isArray(c.products) ? c.products : (Array.isArray(c.productos) ? c.productos : []),
    cantidad: toSafeNumber(c.quantity ?? c.cantidad ?? (Array.isArray(c.products) ? c.products.length : 0)),
    username: c.username ?? "",
    contraseña: "••••••••",
    estado: c.status ?? c.estado ?? "activa",
    fechaCreacion: c.fechaCreacion ?? c.createdAt ?? c.created_at ?? new Date().toISOString(),
    totalCampañas: toSafeNumber(c.total_campaigns ?? c.totalCampañas),
    inversionTotal: toSafeNumber(c.total_investment ?? c.inversionTotal),
  }
}

export async function getAllCompanies(): Promise<Company[]> {
  const data = await apiGetAllCompanies()
  const rows = Array.isArray(data) ? data : Array.isArray(data?.companies) ? data.companies : []
  return rows.map(mapCompany)
}

export async function createCompanyWithUser(payload: any) {
  return apiCreateCompanyWithUser(payload)
}

export async function deleteCompany(companyId: string): Promise<void> {
  await apiDeleteCompany(companyId)
}

export async function decrementCompanyCampaignCount(companyId: string, budget: number): Promise<void> {
  await apiDecrementCompanyCampaignCount(companyId, budget)
}

export async function getCompany(companyId: string): Promise<Company | null> {
  if (!companyId) return null
  const data = await apiGetCompany(companyId)
  const company = (data as any)?.company ?? data
  if (!company) return null
  return mapCompany(company)
}

export async function incrementCompanyCampaignCount(companyId: string, budget: number): Promise<void> {
  await apiUpdateCompanyCampaignStats(companyId, { 
    deltaCampaigns: 1, 
    deltaBudget: Math.abs(budget || 0) 
  })
}