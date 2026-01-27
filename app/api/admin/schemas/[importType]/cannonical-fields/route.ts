// app/api/admin/schemas/[importType]/canonical-fields/route.ts

import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function POST(req: Request, ctx: { params: Promise<{ importType: string }> }) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)
    const { importType } = await ctx.params

    const body = await req.json()

    const upstream = await fetch(`${BASE}/admin/schemas/${importType}/canonical-fields`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const text = await upstream.text()
    return new NextResponse(text, { status: upstream.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}
