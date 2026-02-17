// app/api/assets/read-url/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function GET(req: Request) {
  try {
    if (!BASE) {
      return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    }

    const auth = passthroughAuth(req)
    const { searchParams } = new URL(req.url)
    const gsUri = searchParams.get("gsUri") ?? ""
    const expiresMinutes = searchParams.get("expiresMinutes") ?? "60"

    const upstream = await fetch(
      `${BASE}/assets/read-url?gsUri=${encodeURIComponent(gsUri)}&expiresMinutes=${expiresMinutes}`,
      {
        method: "GET",
        headers: { Authorization: auth },
        cache: "no-store",
      }
    )

    const data = await upstream.json()

    return NextResponse.json(data, {
      status: upstream.status,
    })
  } catch (e: any) {
    console.error("Error in assets/read-url proxy:", e)
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}