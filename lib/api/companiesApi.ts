// lib/api/companiesApi.ts


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

type CreateCompanyWithUserInput =
  | {
      company: any
      user: { email: string; password: string; nombre?: string; cedula?: string }
    }
  | Record<string, any>

function normalizeCreateCompanyPayload(input: CreateCompanyWithUserInput) {
  if ((input as any)?.company && (input as any)?.user) {
    const { company, user } = input as any

    const productos =
      typeof company.productos === "string"
        ? company.productos.split(",").map((p: string) => p.trim()).filter(Boolean)
        : Array.isArray(company.productos)
          ? company.productos
          : []
    return {
      company: {
        name: company.nombre,
        type: company.tipo,
        size: company.tamaño,
        products: productos,
        quantity: company.cantidad,
        status: company.estado,
        username: company.username,
      },
      user: {
        email: user.email,
        password: user.password,
        nombre: user.nombre,
        cedula: user.cedula,
      }
    }
  }

  const anyIn = input as any
  const productos =
    typeof anyIn.productos === "string"
      ? anyIn.productos.split(",").map((p: string) => p.trim()).filter(Boolean)
      : Array.isArray(anyIn.productos)
        ? anyIn.productos
        : []

  return {
    company: {
      name: anyIn.nombre,
      type: anyIn.tipo,
      size: anyIn.tamaño,
      products: productos,
      quantity: anyIn.cantidad,
      status: anyIn.estado,
      username: anyIn.username,
    },
    user: {
      email: anyIn.email ?? anyIn.userEmail,
      password: anyIn.password ?? anyIn.userPassword ?? anyIn.contraseña,
      nombre: anyIn.userNombre,
      cedula: anyIn.cedula,
    }
  }
}

// NO PROBADA

export async function apiGetAllCompanies() {
  const headers = await authHeaders()
  const res = await fetch("/api/admin/companies", {
    method: "GET",
    headers,
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// PROBANDO

export async function apiCreateCompanyWithUser(payload: CreateCompanyWithUserInput) {
  const headers = await authHeaders()
  const body = normalizeCreateCompanyPayload(payload)

  console.log("CREATE COMPANY BODY SENT =>", JSON.stringify(body, null, 2))

  const res = await fetch("/api/admin/companies", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ ok: true; companyId: string; uid: string }>
}

export async function apiDeleteCompany(companyId: string) {
  const headers = await authHeaders()
  const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}`, {
    method: "DELETE",
    headers,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiDecrementCompanyCampaignCount(companyId: string, budget: number) {
  const headers = await authHeaders()
  const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}/campaign-stats`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ deltaCampaigns: -1, deltaBudget: -Math.abs(budget || 0) }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
export async function apiGetCompany(companyId: string) {
  const headers = await authHeaders()
  const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiUpdateCompanyCampaignStats(
  companyId: string,
  input: { deltaCampaigns: number; deltaBudget: number }
) {
  const headers = await authHeaders()
  const res = await fetch(`/api/admin/companies/${encodeURIComponent(companyId)}/campaign-stats`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}