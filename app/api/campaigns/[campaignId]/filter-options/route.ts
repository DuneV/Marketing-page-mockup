// app/api/campaigns/[campaignId]/filter-options/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function GET(req: Request, ctx: { params: Promise<{ campaignId: string }> }) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })

    const auth = passthroughAuth(req)
    const { campaignId } = await ctx.params

    const { searchParams } = new URL(req.url)
    const fields = searchParams.get("fields") ?? ""

    const upstream = await fetch(`${BASE}/campaigns/${campaignId}/filter-options?fields=${encodeURIComponent(fields)}`, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    })

    const data = await upstream.json()
    
    return NextResponse.json(data, {
      status: upstream.status,
    })
  } catch (e: any) {
    console.error("Error in filter-options proxy:", e)
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}