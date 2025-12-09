"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"

interface FiltersPanelProps {
  onFiltersChange: (filters: FilterState) => void
}

export interface FilterState {
  dateRange: string
  brand: string
  metric: string
}

export function FiltersPanel({ onFiltersChange }: FiltersPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "30",
    brand: "all",
    metric: "all",
  })

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  return (
    <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Período</label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange("dateRange", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Marca</label>
          <select
            value={filters.brand}
            onChange={(e) => handleFilterChange("brand", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">Todas las marcas</option>
            <option value="aguila">Águila</option>
            <option value="poker">Poker</option>
            <option value="clubcolombia">Club Colombia</option>
            <option value="ponymalta">Pony Malta</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Métrica</label>
          <select
            value={filters.metric}
            onChange={(e) => handleFilterChange("metric", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">Todas las métricas</option>
            <option value="sales">Ventas</option>
            <option value="revenue">Ingresos</option>
            <option value="engagement">Engagement</option>
            <option value="reach">Alcance</option>
          </select>
        </div>
      </div>
    </Card>
  )
}
