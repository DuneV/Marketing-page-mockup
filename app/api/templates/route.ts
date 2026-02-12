// app\api\templates\route.ts

export const runtime = "nodejs"

import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_URL ?? process.env.NEXT_PUBLIC_IMPORT_API_URL

export async function GET(req: Request) {
  if (!BASE) {
    return NextResponse.json({ error: "IMPORT_API_URL missing" }, { status: 500 })
  }

  const url = new URL(req.url)
  const target = `${BASE}/templates${url.search}`

  const fwd = new Headers()
  const auth = req.headers.get("authorization")
  if (auth) fwd.set("authorization", auth)

  fwd.set("accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

  const res = await fetch(target, { headers: fwd, method: "GET" })

  const outHeaders = new Headers(res.headers)
  outHeaders.set("cache-control", "no-store")

  return new NextResponse(res.body, {
    status: res.status,
    headers: outHeaders,
  })
}
