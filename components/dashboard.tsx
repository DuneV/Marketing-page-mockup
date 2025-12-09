"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ReportGenerator } from "@/components/report-generator"
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

const kpiData = [
  { label: "Total Investment", value: "$2,450,000", icon: "💰", color: "bg-amber-600" as const },
  { label: "ROI", value: "245%", icon: "📈", color: "bg-red-600" as const },
  { label: "Total Reach", value: "12.5M", icon: "👥", color: "bg-amber-600" as const },
  { label: "Impressions", value: "48.3M", icon: "👀", color: "bg-red-600" as const },
]

export default function Dashboard() {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "30",
    brand: "all",
    metric: "all",
  })
  const [activeTab, setActiveTab] = useState<"overview" | "people" | "company" | "employee">("overview")
  const [userType, setUserType] = useState<"employee" | "company">("company")

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (user) {
      try {
        const userData = JSON.parse(user)
        setUserType(userData.userType || "company")
      } catch (e) {
        console.error("Error parsing user data")
      }
    }
  }, [])

  const dateRangeLabel =
    {
      "7": "Last 7 days",
      "30": "Last 30 days",
      "90": "Last 90 days",
      "365": "Last year",
    }[filters.dateRange] || "Last 30 days"

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-600">Bavaria</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">Marketing Campaign Tracker</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
            <ThemeToggle />
            <div className="hidden sm:block">
              <ReportGenerator kpis={kpiData} dateRange={dateRangeLabel} />
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent text-xs sm:text-sm"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 sm:gap-8">
          {userType === "company" && (
            <>
              {(["overview", "people", "company"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-1 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "border-amber-600 text-amber-600"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                  }`}
                >
                  {tab === "overview" ? "Resumen" : tab === "people" ? "Personas" : "Empresa"}
                </button>
              ))}
            </>
          )}

          {userType === "employee" && (
            <>
              {(["overview", "employee"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-1 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "border-amber-600 text-amber-600"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
                  }`}
                >
                  {tab === "overview" ? "Resumen" : "Mi Campaña"}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Filters and Campaign Selection */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <FiltersPanel onFiltersChange={setFilters} />
              </div>
              <CampaignSelector />
            </div>
          </section>

          {/* KPI Cards */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiData.map((kpi) => (
                <KPICard key={kpi.label} {...kpi} />
              ))}
            </div>
          </section>

          {/* Main Charts */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SalesBarChart />
              <ChannelPieChart />
            </div>
            <EngagementLineChart />
          </section>

          {/* Additional Insights */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ConversionRateChart />
              <AudienceDemographicsChart />
              <CostEfficiencyChart />
            </div>
          </section>

          {/* Company Comments */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
            <CompanyComments />
          </section>
        </>
      )}

      {/* People Tab - Company Only */}
      {activeTab === "people" && userType === "company" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <PeopleMonitoring />
        </section>
      )}

      {/* Company Tab - Company Only */}
      {activeTab === "company" && userType === "company" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <CompanyComments />
        </section>
      )}

      {/* Employee Campaign View - Employee Only */}
      {activeTab === "employee" && userType === "employee" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <EmployeeCampaignView />
        </section>
      )}
    </main>
  )
}
