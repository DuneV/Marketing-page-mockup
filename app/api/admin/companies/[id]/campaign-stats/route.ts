// app\api\admin\companies\[id]\campaign-stats\route.ts

import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })

    const auth = passthroughAuth(req)
    const body = await req.text()
    const { id } = await ctx.params

    const upstream = await fetch(`${BASE}/admin/companies/${id}/campaign-stats`, {
      method: "PATCH",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body,
    })

    const text = await upstream.text()
    return new NextResponse(text, { status: upstream.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}
