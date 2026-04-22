import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

export async function PATCH(req: Request, ctx: { params: Promise<{ campaignId: string }> }) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = req.headers.get("authorization")
    if (!auth) return NextResponse.json({ error: "Missing auth" }, { status: 401 })
    const { campaignId } = await ctx.params
    const body = await req.text()

    const upstream = await fetch(`${BASE}/campaigns/${campaignId}/transfer-company`, {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
    })
    const text = await upstream.text()
    return new NextResponse(text, { status: upstream.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}