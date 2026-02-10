// app/api/admin/companies/[id]/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

function assertValidId(id: any) {
  return typeof id === "string" && id.trim() && id !== "undefined" && id !== "null"
}

// 👇 OJO: params ahora viene como Promise en tu runtime
type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)

    const { id } = await ctx.params
    if (!assertValidId(id)) return NextResponse.json({ error: "INVALID_COMPANY_ID_PROXY", id }, { status: 400 })

    const upstream = await fetch(`${BASE}/admin/companies/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    })

    const text = await upstream.text()
    const ct = upstream.headers.get("content-type") ?? "application/json"
    return new NextResponse(text, { status: upstream.status, headers: { "Content-Type": ct } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)

    const { id } = await ctx.params
    if (!assertValidId(id)) return NextResponse.json({ error: "INVALID_COMPANY_ID_PROXY", id }, { status: 400 })

    const body = await req.text()

    const upstream = await fetch(`${BASE}/admin/companies/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    })

    const text = await upstream.text()
    const ct = upstream.headers.get("content-type") ?? "application/json"
    return new NextResponse(text, { status: upstream.status, headers: { "Content-Type": ct } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)

    const { id } = await ctx.params
    if (!assertValidId(id)) return NextResponse.json({ error: "INVALID_COMPANY_ID_PROXY", id }, { status: 400 })

    const upstream = await fetch(`${BASE}/admin/companies/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: auth },
    })

    const text = await upstream.text()
    const ct = upstream.headers.get("content-type") ?? "application/json"
    return new NextResponse(text, { status: upstream.status, headers: { "Content-Type": ct } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}