"use client"

import { useState } from "react"
import { TabsEmployee } from "./TabsEmployee"
import { OverviewEmployee } from "./OverviewEmployee"
import { EmployeeCampaignView } from "@/components/employee-campaign-view"

export function EmployeeDashboard() {
  const [active, setActive] = useState("overview")

  return (
    <>
      <TabsEmployee active={active} setActive={setActive} />

      {active === "overview" && <OverviewEmployee />}

      {active === "campaign" && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <EmployeeCampaignView />
        </section>
      )}
    </>
  )
}
