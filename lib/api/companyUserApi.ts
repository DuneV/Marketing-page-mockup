// lib/api/companyUsersApi.ts
import { auth } from "@/lib/firebase/client"

async function authHeaders() {
  const user = auth.currentUser
  if (!user) throw new Error("No auth user")
  const token = await user.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

async function safeJsonOrText(res: Response) {
  const ct = res.headers.get("content-type") ?? ""
  const text = await res.text()
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text)
    } catch {
      return { raw: text }
    }
  }
  return { raw: text }
}

export async function apiCompanyUsersList() {
  const headers = await authHeaders()
  const res = await fetch("/api/company/users", { method: "GET", headers, cache: "no-store" })
  if (!res.ok) {
    const err = await safeJsonOrText(res)
    throw new Error((err as any)?.error ?? (err as any)?.raw ?? `HTTP_${res.status}`)
  }
  return res.json()
}

export async function apiCompanyUsersCreate(input: {
  email: string
  password: string
  nombre: string
  cedula?: string
  companyRole?: "manager" | "member"
  areaId?: string | null
}) {
  const headers = await authHeaders()
  const res = await fetch("/api/company/users", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await safeJsonOrText(res)
    throw new Error((err as any)?.error ?? (err as any)?.raw ?? `HTTP_${res.status}`)
  }
  return res.json()
}

export async function apiCompanyUsersPatch(uid: string, patch: any) {
  const headers = await authHeaders()
  const res = await fetch(`/api/company/users/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await safeJsonOrText(res)
    throw new Error((err as any)?.error ?? (err as any)?.raw ?? `HTTP_${res.status}`)
  }
  return res.json()
}

export async function apiCompanyUsersDelete(uid: string) {
  const headers = await authHeaders()
  const res = await fetch(`/api/company/users/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  })
  if (!res.ok) {
    const err = await safeJsonOrText(res)
    throw new Error((err as any)?.error ?? (err as any)?.raw ?? `HTTP_${res.status}`)
  }
  return res.json()
}