"use client"

import KPICard from "@/components/kpi-card"
import { EmployeeCampaignView } from "@/components/employee-campaign-view"

export function OverviewEmployee() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      <h2 className="text-xl font-semibold mb-4">Mi Actividad</h2>

      {/* KPIs personales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <KPICard label="Mis ventas" value="350" icon="🛒" color="bg-amber-600" />
        <KPICard label="Conversión" value="12%" icon="🎯" color="bg-red-600" />
      </div>

      <EmployeeCampaignView />
    </section>
  )
}
