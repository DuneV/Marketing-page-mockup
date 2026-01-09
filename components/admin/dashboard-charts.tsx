"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { MonthlyBudget, CompanyInvestment } from "@/lib/utils/dashboard-metrics"

interface DashboardChartsProps {
  monthlyBudgets: MonthlyBudget[]
  topCompanies: CompanyInvestment[]
  campaignsByStatus: {
    planificacion: number
    activa: number
    completada: number
    cancelada: number
  }
}

const COLORS = {
  planificacion: "#3b82f6", // blue
  activa: "#22c55e", // green
  completada: "#6b7280", // gray
  cancelada: "#ef4444", // red
}

const PIE_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6"]

export function DashboardCharts({ monthlyBudgets, topCompanies, campaignsByStatus }: DashboardChartsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: "compact",
      compactDisplay: "short",
    }).format(value)
  }

  // Datos para gráfico de pastel
  const pieData = [
    { name: "Planificación", value: campaignsByStatus.planificacion, color: COLORS.planificacion },
    { name: "Activa", value: campaignsByStatus.activa, color: COLORS.activa },
    { name: "Completada", value: campaignsByStatus.completada, color: COLORS.completada },
    { name: "Cancelada", value: campaignsByStatus.cancelada, color: COLORS.cancelada },
  ].filter(item => item.value > 0) // Solo mostrar estados con campañas

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de líneas - Presupuestos mensuales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presupuestos por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyBudgets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--foreground))" }}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [formatCurrency(value), "Presupuesto"]}
              />
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de barras - Top empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 Empresas por Inversión</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCompanies} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fill: "hsl(var(--foreground))" }}
                tickFormatter={formatCurrency}
              />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs"
                tick={{ fill: "hsl(var(--foreground))" }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => [formatCurrency(value), "Inversión"]}
              />
              <Bar dataKey="investment" radius={[0, 4, 4, 0]}>
                {topCompanies.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de pastel - Campañas por estado */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Distribución de Campañas por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
