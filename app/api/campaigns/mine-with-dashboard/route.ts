// app/api/campaigns/mine-with-dashboard/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

export async function GET(req: Request) {
  try {
    if (!BASE) {
      return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    }

    const auth = req.headers.get("authorization")
    if (!auth) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
    }

    const upstream = await fetch(`${BASE}/campaigns/mine-with-dashboard`, {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    })

    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}
