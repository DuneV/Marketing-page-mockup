import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ campaignId: string; sourceLabel: string }> }
) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })

    const auth = req.headers.get("authorization")
    if (!auth) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })

    const { campaignId, sourceLabel } = await ctx.params

    const upstream = await fetch(
      `${BASE}/campaigns/${campaignId}/imports/slot/${encodeURIComponent(sourceLabel)}`,
      {
        method: "DELETE",
        headers: { Authorization: auth },
      }
    )

    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}