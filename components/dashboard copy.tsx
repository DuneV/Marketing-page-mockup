// components/dashboard.tsx

"use client"

import { useState } from "react"
import { FiltersPanel, type FilterState } from "@/components/filters-panel"
import { CampaignSelector } from "@/components/campaign-selector"
import { CompanyComments } from "@/components/company-comments"
import { PeopleMonitoring } from "@/components/people-monitoring"
import { ConversionRateChart, AudienceDemographicsChart, CostEfficiencyChart } from "@/components/additional-charts"
import KPICard from "@/components/kpi-card"
import SalesBarChart from "@/components/charts/sales-bar-chart"
import EngagementLineChart from "@/components/charts/engagement-line-chart"
import ChannelPieChart from "@/components/charts/channel-pie-chart"
import { EmployeeCampaignView } from "@/components/employee-campaign-view"
import type { ViewType } from "@/components/app-sidebar"

const kpiData = [
  { label: "Total Investment", value: "$2,450,000", icon: "💰", color: "bg-amber-600" as const },
  { label: "ROI", value: "245%", icon: "📈", color: "bg-red-600" as const },
  { label: "Total Reach", value: "12.5M", icon: "👥", color: "bg-amber-600" as const },
  { label: "Impressions", value: "48.3M", icon: "👀", color: "bg-red-600" as const },
]

interface DashboardProps {
  activeView: ViewType
  userType: "employee" | "company"
}

export default function Dashboard({ activeView, userType }: DashboardProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "30",
    brand: "all",
    metric: "all",
  })

  const dateRangeLabel =
    {
      "7": "Last 7 days",
      "30": "Last 30 days",
      "90": "Last 90 days",
      "365": "Last year",
    }[filters.dateRange] || "Last 30 days"

  return (
    <>

      {/* Overview View */}
      {activeView === "overview" && (
        <>
          {/* Filters and Campaign Selection */}
          <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 h-full [&>*]:h-full">
              <FiltersPanel onFiltersChange={setFilters} />
            </div>

            <div className="h-full">
              <CampaignSelector />
            </div>
          </div>
          </section>

          {/* KPI Cards */}
          <section className="mt-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map((kpi) => (
                <KPICard key={kpi.label} {...kpi} />
              ))}
            </div>
          </section>

          {/* Main Charts */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SalesBarChart />
              <ChannelPieChart />
            </div>
            <EngagementLineChart />
          </section>

          {/* Additional Insights */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ConversionRateChart />
              <AudienceDemographicsChart />
              <CostEfficiencyChart />
            </div>
          </section>

          {/* Company Comments */}
          <section>
            <CompanyComments />
          </section>
        </>
      )}

      {/* People View - Company Only */}
      {activeView === "people" && userType === "company" && (
        <section>
          <PeopleMonitoring />
        </section>
      )}

      {/* Company View - Company Only */}
      {activeView === "company" && userType === "company" && (
        <section>
          <CompanyComments />
        </section>
      )}

      {/* Employee Campaign View - Employee Only */}
      {activeView === "employee" && userType === "employee" && (
        <section>
          <EmployeeCampaignView />
        </section>
      )}
    </>
  )
}
