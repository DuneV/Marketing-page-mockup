// app/api/admin/companies/route.ts

import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function GET(req: Request) {
  if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
  const auth = passthroughAuth(req)

  const upstream = await fetch(`${BASE}/admin/companies`, {
    headers: { Authorization: auth },
    cache: "no-store",
  })

  const text = await upstream.text()
  return new NextResponse(text, { status: upstream.status })
}

export async function POST(req: Request) {
  if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
  const auth = passthroughAuth(req)
  const body = await req.text()

  const upstream = await fetch(`${BASE}/admin/companies`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
  })

  const text = await upstream.text()
  return new NextResponse(text, { status: upstream.status })
}
