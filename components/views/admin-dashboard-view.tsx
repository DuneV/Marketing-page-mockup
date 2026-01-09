"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { DashboardCharts } from "@/components/admin/dashboard-charts"
import { AlertFeed } from "@/components/admin/alert-feed"
import { Database, TrendingUp, Target, Building2, CheckCircle, DollarSign } from "lucide-react"
import { getAllCampaigns } from "@/lib/data/campaigns"
import { getAllCompanies } from "@/lib/data/companies"
import {
  calculateDashboardMetrics,
  calculatePreviousMonthMetrics,
  calculateTrend,
  getExpiringCampaigns,
  getInactiveCompanies,
  type DashboardMetrics,
} from "@/lib/utils/dashboard-metrics"
import type { Campaign } from "@/types/campaign"
import type { Company } from "@/types/company"

export function AdminDashboardView() {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [previousMetrics, setPreviousMetrics] = useState<DashboardMetrics | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [loadedCampaigns, loadedCompanies] = await Promise.all([
        getAllCampaigns(),
        getAllCompanies(),
      ])

      setCampaigns(loadedCampaigns as Campaign[])
      setCompanies(loadedCompanies)

      // Calcular todas las métricas
      const dashboardMetrics = calculateDashboardMetrics(loadedCampaigns as Campaign[], loadedCompanies)
      setMetrics(dashboardMetrics)

      // Calcular métricas del mes anterior para tendencias
      const prevMetrics = calculatePreviousMonthMetrics(loadedCampaigns as Campaign[], loadedCompanies)
      setPreviousMetrics(prevMetrics)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  // Calcular alertas
  const expiringCampaigns = getExpiringCampaigns(campaigns)
  const inactiveCompanies = getInactiveCompanies(companies, campaigns, 30)

  // Datos para gráficos
  const campaignsByStatus = {
    planificacion: campaigns.filter((c) => c.estado === "planificacion").length,
    activa: campaigns.filter((c) => c.estado === "activa").length,
    completada: campaigns.filter((c) => c.estado === "completada").length,
    cancelada: campaigns.filter((c) => c.estado === "cancelada").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-amber-600" />
        <h2 className="text-2xl font-bold">Dashboard de Administración</h2>
      </div>

      {/* KPI Cards - 2 filas de 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Fila 1 */}
        <AdminKPICard
          label="Total de Campañas"
          value={metrics.totalCampaigns}
          icon={Target}
          color="amber"
          trend={previousMetrics ? calculateTrend(metrics.totalCampaigns, previousMetrics.totalCampaigns) : undefined}
        />
        <AdminKPICard
          label="Campañas Activas"
          value={`${metrics.activeCampaigns} / ${metrics.totalCampaigns}`}
          icon={TrendingUp}
          color="red"
          trend={previousMetrics ? calculateTrend(metrics.activeCampaigns, previousMetrics.activeCampaigns) : undefined}
        />
        <AdminKPICard
          label="Tasa de Completitud"
          value={`${metrics.completionRate.toFixed(1)}%`}
          icon={CheckCircle}
          color="amber"
          trend={previousMetrics ? calculateTrend(metrics.completionRate, previousMetrics.completionRate) : undefined}
        />

        {/* Fila 2 */}
        <AdminKPICard
          label="Presupuesto Total"
          value={formatCurrency(metrics.totalBudget)}
          icon={DollarSign}
          color="red"
          trend={previousMetrics ? calculateTrend(metrics.totalBudget, previousMetrics.totalBudget) : undefined}
        />
        <AdminKPICard
          label="Presupuesto Promedio"
          value={formatCurrency(metrics.averageBudget)}
          icon={DollarSign}
          color="amber"
          trend={previousMetrics ? calculateTrend(metrics.averageBudget, previousMetrics.averageBudget) : undefined}
        />
        <AdminKPICard
          label="Empresas Activas"
          value={`${metrics.activeCompanies} / ${metrics.totalCompanies}`}
          icon={Building2}
          color="red"
          trend={previousMetrics ? calculateTrend(metrics.activeCompanies, previousMetrics.activeCompanies) : undefined}
        />
      </div>

      {/* Gráficos */}
      <DashboardCharts
        monthlyBudgets={metrics.monthlyBudgets}
        topCompanies={metrics.topCompanies}
        campaignsByStatus={campaignsByStatus}
      />

      {/* Alertas y Notificaciones */}
      <AlertFeed expiringCampaigns={expiringCampaigns} inactiveCompanies={inactiveCompanies} />
    </div>
  )
}
