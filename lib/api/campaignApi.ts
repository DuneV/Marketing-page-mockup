// lib\api\campaignApi.ts

import { authHeaders } from "@/lib/api/authHeaders"
import type { ReportConfiguration } from "@/types/report-config"

export interface AvailableField {
  name: string
  type: "number" | "text" | "date" | "boolean" | "unknown"
  sampleCount: number
}

export interface AvailableFilter {
  name: string
  type: "number" | "text" | "date" | "boolean" | "unknown"
  operators: string[]
}

export type CampaignDatasetRow = Record<string, any>

function getBaseUrl() {
  // Si ya tienes un BASE_URL en tu proyecto úsalo.
  // Ejemplo: NEXT_PUBLIC_API_URL="https://tu-api.com"
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) return "" // usa rutas relativas si estás en Next con /api/...
  return base
}

export async function getAvailableFields(campaignId: string): Promise<{
  fields: AvailableField[]
  filters: AvailableFilter[]
  importId: string | null
}> {
  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/${campaignId}/available-fields`, {
    method: "GET",
    headers,
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error("getAvailableFields failed:", errorText)
    throw new Error(errorText)
  }

  return res.json()
}

// Operaciones válidas por tipo de dato
export const VALID_OPERATIONS_BY_TYPE: Record<string, string[]> = {
  number: ["sum", "mean", "count", "max", "min", "median", "std", "variance"],
  text: ["count"],
  date: ["count", "max", "min"],
  boolean: ["count"],
  unknown: ["count"],
}

export function getValidOperations(fieldType: string): string[] {
  return VALID_OPERATIONS_BY_TYPE[fieldType] || ["count"]
}

export async function getCampaignReportConfig(campaignId: string) {
  const headers = await authHeaders()
  const res = await fetch(`/api/campaigns/${campaignId}/report-config`, { method: "GET", headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveCampaignReportConfig(campaignId: string, config: ReportConfiguration) {
  const headers = await authHeaders()
  const res = await fetch(`/api/campaigns/${campaignId}/report-config`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCampaignDataset(campaignId: string) {
  if (!campaignId) throw new Error("campaignId requerido")

  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/${campaignId}/dataset`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return Array.isArray(json?.rows) ? json.rows : []
}

export async function deleteCampaignImports(campaignId: string) {
  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/${campaignId}/imports`, {
    method: "DELETE",
    headers,
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    ok: true
    deletedImports: number
    deletedStagingRows: number
    deletedMappings: number
  }>
}

export async function deleteCampaignReportConfig(campaignId: string) {
  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/${campaignId}/report-config`, {
    method: "DELETE",
    headers,
  })

  if (!res.ok && res.status !== 404) throw new Error(await res.text())
  return res.ok ? res.json() : { ok: true, deleted: false }
}

export async function getCampaignsWithReportConfig() {
  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/with-report-config`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ campaignIds: string[]; items: Array<{ campaignId: string; gsUri: string }> }>
}

export async function getMyCampaignsWithDashboard() {
  const headers = await authHeaders()

  const res = await fetch(`/api/campaigns/mine-with-dashboard`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ 
    campaignIds: string[]
    campaigns: any[]
  }>
}

export async function getFilterOptions(campaignId: string, fields: string[]) {
  const headers = await authHeaders()
  
  const fieldsParam = fields.join(",")
  const res = await fetch(`/api/campaigns/${campaignId}/filter-options?fields=${encodeURIComponent(fieldsParam)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  if (!res.ok) throw new Error(await res.text())
  
  // El backend devuelve: { options: { fieldName: [{value, label}] }, importId }
  // o puede devolver directamente: { fieldName: [values] }
  return res.json() as Promise<{
    options?: Record<string, Array<{ value: string; label: string }>>
    importId?: string
    [key: string]: any
  }>
}

/**
 * Sube un archivo de imagen a GCS y devuelve el gsUri
 */
export async function uploadAsset(params: {
  companyId: string
  campaignId?: string
  file: File
}): Promise<{ gcsUri: string }> {
  const headers = await authHeaders()

  // 1) Solicitar URL de subida firmada
  const urlRes = await fetch(`/api/assets/upload-url`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      companyId: params.companyId,
      campaignId: params.campaignId,
      filename: params.file.name,
      contentType: params.file.type,
    }),
  })

  if (!urlRes.ok) {
    const errorText = await urlRes.text()
    throw new Error(`Failed to get upload URL: ${errorText}`)
  }

  const { uploadUrl, gcsUri } = await urlRes.json()

  // 2) Subir el archivo directamente a GCS usando la URL firmada
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.file.type,
    },
    body: params.file,
  })

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload file: ${uploadRes.statusText}`)
  }

  return { gcsUri }
}

/**
 * Obtiene una URL pública temporal (firmada) para leer un asset desde GCS
 */
export async function getAssetReadUrl(gcsUri: string, expiresMinutes: number = 60): Promise<string> {
  const headers = await authHeaders()

  const res = await fetch(
    `/api/assets/read-url?gsUri=${encodeURIComponent(gcsUri)}&expiresMinutes=${expiresMinutes}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error(await res.text())
  }

  const { url } = await res.json()
  return url
}