export const runtime = "nodejs"
import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_IMPORT_API_URL!

export async function POST(req: Request) {
  const headers = new Headers(req.headers)
  headers.delete("host")

  const res = await fetch(`${BASE}/imports`, {
    method: "POST",
    headers,
    body: await req.text(),
  })

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: res.headers,
  })
}
