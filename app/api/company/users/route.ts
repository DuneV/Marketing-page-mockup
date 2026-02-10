// app/api/company/users/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function GET(req: Request) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)

    const upstream = await fetch(`${BASE}/company/users`, {
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

export async function POST(req: Request) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)
    const body = await req.text()

    const upstream = await fetch(`${BASE}/company/users`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
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