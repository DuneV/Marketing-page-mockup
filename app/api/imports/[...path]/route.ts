export const runtime = "nodejs"
import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_IMPORT_API_URL!

async function proxy(req: Request, path: string[]) {
  const url = new URL(req.url)
  const target = `${BASE}/imports/${path.join("/")}${url.search}`

  const headers = new Headers(req.headers)
  headers.delete("host")

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  })

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: res.headers,
  })
}

export async function POST(req: Request, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path)
}
export async function GET(req: Request, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path)
}
