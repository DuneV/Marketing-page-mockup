// lib/api/reportRunner.ts
import { authHeaders } from "@/lib/api/authHeaders"
import type { ReportConfiguration } from "@/types/report-config"

export async function runCampaignReport(campaignId: string, config: any) {
  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/${campaignId}/run-report`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })

  if (!res.ok) throw new Error(await res.text())

  return res.json() as Promise<{
    importId: string | null
    kpis: Record<string, { id: string; nombre: string; value: number }>
    charts: Record<string, any[]>
    rowCount: number
  }>
}

//  NUEVA FUNCIÓN
export async function getCampaignFilterOptions(
  campaignId: string, 
  fields: string[]
): Promise<{
  options: Record<string, Array<{ value: string; label: string }>>
  importId: string | null
}> {
  const headers = await authHeaders()
  
  const fieldsParam = fields.join(",")
  const res = await fetch(
    `/api/campaigns/${campaignId}/filter-options?fields=${encodeURIComponent(fieldsParam)}`,
    { headers }
  )

  if (!res.ok) throw new Error(await res.text())

  return res.json()
}