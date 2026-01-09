// lib/utils/dashboard-metrics.ts
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import type { Campaign } from "@/types/campaign"
import type { Company } from "@/types/company"

export interface MonthlyBudget {
  month: string
  budget: number
}

export interface CompanyInvestment {
  name: string
  investment: number
}

export interface DashboardMetrics {
  totalBudget: number
  activeCampaigns: number
  completedCampaigns: number
  totalCampaigns: number
  activeCompanies: number
  totalCompanies: number
  monthlyBudgets: MonthlyBudget[]
  topCompanies: CompanyInvestment[]
  completionRate: number
  averageBudget: number
}

/**
 * Calcula las métricas del dashboard basadas en campañas y empresas
 */
export function calculateDashboardMetrics(
  campaigns: Campaign[],
  companies: Company[]
): DashboardMetrics {
  // KPIs básicos
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.estado === "activa").length
  const completedCampaigns = campaigns.filter((c) => c.estado === "completada").length
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.presupuesto || 0), 0)
  const averageBudget = totalCampaigns > 0 ? totalBudget / totalCampaigns : 0
  const completionRate = totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0

  // Empresas activas
  const activeCompanies = companies.filter((c) => c.estado === "activa").length
  const totalCompanies = companies.length

  // Presupuestos por mes (últimos 6 meses)
  const monthlyBudgets = calculateMonthlyBudgets(campaigns, 6)

  // Top 5 empresas por inversión
  const topCompanies = calculateTopCompanies(companies, 5)

  return {
    totalBudget,
    activeCampaigns,
    completedCampaigns,
    totalCampaigns,
    activeCompanies,
    totalCompanies,
    monthlyBudgets,
    topCompanies,
    completionRate,
    averageBudget,
  }
}

/**
 * Calcula presupuestos agrupados por mes para los últimos N meses
 */
function calculateMonthlyBudgets(campaigns: Campaign[], months: number): MonthlyBudget[] {
  const result: MonthlyBudget[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const targetDate = subMonths(now, i)
    const monthStart = startOfMonth(targetDate)
    const monthEnd = endOfMonth(targetDate)

    const monthlyTotal = campaigns
      .filter((campaign) => {
        if (!campaign.fechaInicio) return false
        const startDate = new Date(campaign.fechaInicio)
        return startDate >= monthStart && startDate <= monthEnd
      })
      .reduce((sum, c) => sum + (c.presupuesto || 0), 0)

    result.push({
      month: format(targetDate, "MMM yyyy"),
      budget: monthlyTotal,
    })
  }

  return result
}

/**
 * Calcula las top N empresas por inversión total
 */
function calculateTopCompanies(companies: Company[], topN: number): CompanyInvestment[] {
  return companies
    .map((company) => ({
      name: company.nombre,
      investment: company.inversionTotal || 0,
    }))
    .sort((a, b) => b.investment - a.investment)
    .slice(0, topN)
}

/**
 * Calcula tendencia porcentual comparando dos valores
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Calcula métricas del mes anterior para comparar tendencias
 */
export function calculatePreviousMonthMetrics(
  campaigns: Campaign[],
  companies: Company[]
): DashboardMetrics {
  const now = new Date()
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Filtrar campañas del mes anterior
  const previousMonthCampaigns = campaigns.filter((campaign) => {
    if (!campaign.createdAt) return false
    const createdDate = new Date(campaign.createdAt)
    return createdDate >= previousMonthStart && createdDate <= previousMonthEnd
  })

  // Filtrar empresas del mes anterior
  const previousMonthCompanies = companies.filter((company) => {
    if (!company.createdAt) return false
    const createdDate = new Date(company.createdAt)
    return createdDate >= previousMonthStart && createdDate <= previousMonthEnd
  })

  return calculateDashboardMetrics(previousMonthCampaigns, previousMonthCompanies)
}

/**
 * Obtiene campañas próximas a vencer (menos de 7 días)
 */
export function getExpiringCampaigns(campaigns: Campaign[]): Campaign[] {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return campaigns.filter((campaign) => {
    if (!campaign.fechaFin || campaign.estado !== "activa") return false
    const endDate = new Date(campaign.fechaFin)
    return endDate > now && endDate <= sevenDaysFromNow
  })
}

/**
 * Obtiene empresas sin campañas activas en los últimos N días
 */
export function getInactiveCompanies(
  companies: Company[],
  campaigns: Campaign[],
  days: number = 30
): Company[] {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  return companies.filter((company) => {
    const companyActiveCampaigns = campaigns.filter(
      (c) =>
        c.empresaId === company.id &&
        c.estado === "activa" &&
        c.fechaInicio &&
        new Date(c.fechaInicio) >= cutoffDate
    )
    return companyActiveCampaigns.length === 0
  })
}

/**
 * Obtiene usuarios sin asignar a ninguna campaña
 */
export function getUnassignedUserIds(campaigns: Campaign[]): Set<string> {
  const assignedUserIds = new Set(
    campaigns.filter((c) => c.usuarioResponsableId).map((c) => c.usuarioResponsableId!)
  )
  return assignedUserIds
}
