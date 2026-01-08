// lib/api/campaignApi.ts

import { authHeaders } from "@/lib/api/authHeaders"

export interface AvailableField {
  name: string
  type: "number" | "text" | "date" | "boolean" | "unknown"
  sampleCount: number
}

export async function getAvailableFields(campaignId: string): Promise<{
  fields: AvailableField[]
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
