// lib/api/importApi.ts

import { authHeaders } from "@/lib/api/authHeaders"

export async function createImport(params: { clientId: string; importType: string; filename: string }) {
  const headers = await authHeaders()
  const res = await fetch(`/api/imports`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ importId: string; uploadUrl: string }>
}

export async function analyzeImport(importId: string) {
  const headers = await authHeaders()
  const res = await fetch(`/api/imports/${importId}/analyze`, { method: "POST", headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function commitImport(importId: string, mapping: Record<string, string>) {
  const headers = await authHeaders()
  const res = await fetch(`/api/imports/${importId}/commit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ mapping }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function downloadTemplate(clientId: string, importType: string) {
  // template usa token igual, sin content-type
  const headers = await authHeaders()
  const res = await fetch(
    `/api/templates?clientId=${encodeURIComponent(clientId)}&type=${encodeURIComponent(importType)}`,
    { headers: { Authorization: headers.Authorization } }
  )
  if (!res.ok) throw new Error(await res.text())
  return res.blob()
}
