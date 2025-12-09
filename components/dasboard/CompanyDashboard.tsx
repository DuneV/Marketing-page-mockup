"use client"

import { useState } from "react"
import { TabsCompany } from "./TabsCompany"
import { OverviewCompany } from "./OverviewCompany"
import { PeopleMonitoring } from "@/components/people-monitoring"
import { CompanyComments } from "@/components/company-comments"

export function CompanyDashboard() {
  const [active, setActive] = useState("overview")
  const [filters, setFilters] = useState({ dateRange: "30", brand: "all", metric: "all" })

  return (
    <>
      <TabsCompany active={active} setActive={setActive} />

      {active === "overview" && (
        <OverviewCompany filters={filters} setFilters={setFilters} />
      )}

      {active === "people" && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <PeopleMonitoring />
        </section>
      )}

      {active === "company" && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <CompanyComments />
        </section>
      )}
    </>
  )
}
