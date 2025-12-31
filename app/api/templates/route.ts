export const runtime = "nodejs"

import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_IMPORT_API_URL!

export async function GET(req: Request) {
  const url = new URL(req.url)
  const target = `${BASE}/templates${url.search}`

  const headers = new Headers(req.headers)
  headers.delete("host")

  const res = await fetch(target, { headers, method: "GET" })

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  })
}
