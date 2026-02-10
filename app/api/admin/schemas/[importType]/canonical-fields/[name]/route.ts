import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ importType: string; name: string }> }
) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })

    const auth = passthroughAuth(req)
    const { importType, name } = await ctx.params
    const body = await req.json()

    const upstream = await fetch(
      `${BASE}/admin/schemas/${encodeURIComponent(importType)}/canonical-fields/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    )

    const text = await upstream.text()
    const contentType = upstream.headers.get("content-type") ?? "application/json"
    return new NextResponse(text, { status: upstream.status, headers: { "content-type": contentType } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ importType: string; name: string }> }
) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })

    const auth = passthroughAuth(req)
    const { importType, name } = await ctx.params

    const upstream = await fetch(
      `${BASE}/admin/schemas/${encodeURIComponent(importType)}/canonical-fields/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: { Authorization: auth },
        cache: "no-store",
      }
    )

    const text = await upstream.text()
    const contentType = upstream.headers.get("content-type") ?? "application/json"
    return new NextResponse(text, { status: upstream.status, headers: { "content-type": contentType } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}