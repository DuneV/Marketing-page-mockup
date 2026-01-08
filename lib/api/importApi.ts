// lib/api/importApi.ts

import { authHeaders } from "@/lib/api/authHeaders"

export async function createImport(params: { 
  companyId: string
  importType: string
  filename: string 
}) {
  const headers = await authHeaders()
  const res = await fetch(`/api/imports`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const errorText = await res.text()
    console.error("❌ createImport failed:", errorText)
    throw new Error(errorText)
  }
  return res.json() as Promise<{ importId: string; uploadUrl: string }>
}

export async function analyzeImport(importId: string) {
  const headers = await authHeaders()

  const res = await fetch(`/api/imports/${importId}/analyze`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  })

  const text = await res.text()

  let data: any = null
  try {
    data = JSON.parse(text)
  } catch {
    // no era JSON
  }

  if (!res.ok) {
    console.error("❌ analyzeImport failed (raw)", {
      status: res.status,
      statusText: res.statusText,
      text,
      data,
    })
    throw new Error(data?.error || text || `HTTP ${res.status}`)
  }

  return data ?? text
}



export async function commitImport(importId: string, mapping: Record<string, string>) {
  const headers = await authHeaders()
  const res = await fetch(`/api/imports/${importId}/commit`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mapping }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    console.error("❌ commitImport failed:", errorText)
    throw new Error(errorText)
  }
  return res.json()
}

export async function downloadTemplate(companyId: string, importType: string) {
  const headers = await authHeaders()
  const res = await fetch(
    `/api/templates?companyId=${encodeURIComponent(companyId)}&type=${encodeURIComponent(importType)}`,
    { headers: { Authorization: headers.Authorization } }
  )
  if (!res.ok) {
    const errorText = await res.text()
    console.error("❌ downloadTemplate failed:", errorText)
    throw new Error(errorText)
  }
  return res.blob()
}