export const runtime = "nodejs"
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function getAuth(req: Request) {
  return req.headers.get("authorization")
}

async function proxy(req: Request, path: string[]) {
  if (!BASE) {
    return NextResponse.json(
      { error: "Missing IMPORT_API_BASE_URL" },
      { status: 500 }
    )
  }

  const auth = getAuth(req)
  if (!auth) {
    return NextResponse.json(
      { error: "NO_TOKEN" },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const target =
    `${BASE.replace(/\/$/, "")}` +
    `/imports/${(path ?? []).map(encodeURIComponent).join("/")}` +
    `${url.search}`

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text()

  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      Authorization: auth,
      // Mantén el content-type si viene, si no usa json
      "Content-Type": req.headers.get("content-type") ?? "application/json",
    },
    body,
  })

  const text = await upstream.text()

  // Copia solo content-type (evita headers raros/hop-by-hop)
  const outHeaders = new Headers()
  const ct = upstream.headers.get("content-type")
  if (ct) outHeaders.set("content-type", ct)

  return new NextResponse(text, { status: upstream.status, headers: outHeaders })
}

export async function GET(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path ?? [])
}

export async function POST(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path ?? [])
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path ?? [])
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params
  return proxy(req, path ?? [])
}
