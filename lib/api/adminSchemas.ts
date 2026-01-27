// lib/api/adminSchemas.ts

import { authHeaders } from "@/lib/api/authHeaders"

export type CanonicalSqlType = "string" | "number" | "date" | "boolean" | "image" | "text"

export async function getAdminSchema(importType: string) {
  const headers = await authHeaders()
  const res = await fetch(`/api/admin/schemas/${importType}`, { headers, cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    importType: string
    version: number
    canonical_fields: Record<string, { type?: CanonicalSqlType }>
  }>
}

export async function addCanonicalField(importType: string, payload: { name: string; type: CanonicalSqlType }) {
  const headers = await authHeaders()
  const res = await fetch(`/api/admin/schemas/${importType}/canonical-fields`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ ok: boolean; name: string; type: CanonicalSqlType }>
}
