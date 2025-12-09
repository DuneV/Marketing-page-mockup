"use client"

import { FiltersPanel } from "@/components/filters-panel"
import { CampaignSelector } from "@/components/campaign-selector"
import SalesBarChart from "@/components/charts/sales-bar-chart"
import EngagementLineChart from "@/components/charts/engagement-line-chart"
import ChannelPieChart from "@/components/charts/channel-pie-chart"
import {
  ConversionRateChart,
  AudienceDemographicsChart,
  CostEfficiencyChart,
} from "@/components/additional-charts"
import { CompanyComments } from "@/components/company-comments"
import KPICard from "@/components/kpi-card"

interface OverviewCompanyProps {
  filters: {
    dateRange: string
    brand: string
    metric: string
  }
  setFilters: (value: any) => void
}

const kpiData = [
  { label: "Total Investment", value: "$2,450,000", icon: "💰", color: "bg-amber-600" },
  { label: "ROI", value: "245%", icon: "📈", color: "bg-red-600" },
  { label: "Total Reach", value: "12.5M", icon: "👥", color: "bg-amber-600" },
  { label: "Impressions", value: "48.3M", icon: "👀", color: "bg-red-600" },
]

export function OverviewCompany({ filters, setFilters }: OverviewCompanyProps) {
  return (
    <>
      {/* Filters */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <FiltersPanel onFiltersChange={setFilters} />
          </div>
          <CampaignSelector />
        </div>
      </section>

      {/* KPIs */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((k) => (
            <KPICard key={k.label} {...k} />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesBarChart />
          <ChannelPieChart />
        </div>
        <EngagementLineChart />
      </section>

      {/* Extra */}
      <section className="max-w-7xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ConversionRateChart />
          <AudienceDemographicsChart />
          <CostEfficiencyChart />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-12">
        <CompanyComments />
      </section>
    </>
  )
}
