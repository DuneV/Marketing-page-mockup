// lib/importApi.ts

import { getAuth } from "firebase/auth"

async function authHeaders() {
  const user = getAuth().currentUser
  if (!user) throw new Error("No auth user")
  const token = await user.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

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
  const user = getAuth().currentUser
  if (!user) throw new Error("No auth user")
  const token = await user.getIdToken()

  const res = await fetch(`/api/templates?clientId=${encodeURIComponent(clientId)}&type=${encodeURIComponent(importType)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.blob()
}