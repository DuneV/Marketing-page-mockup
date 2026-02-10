// app/api/company/users/[uid]/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

function assertValidUid(uid: any) {
  return typeof uid === "string" && uid.trim() && uid !== "undefined" && uid !== "null"
}

type Ctx = { params: Promise<{ uid: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)
    const { uid } = await ctx.params
    if (!assertValidUid(uid)) return NextResponse.json({ error: "INVALID_UID_PROXY", uid }, { status: 400 })

    const body = await req.text()

    const upstream = await fetch(`${BASE}/company/users/${encodeURIComponent(uid)}`, {
      method: "PATCH",
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

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)
    const { uid } = await ctx.params
    if (!assertValidUid(uid)) return NextResponse.json({ error: "INVALID_UID_PROXY", uid }, { status: 400 })

    const upstream = await fetch(`${BASE}/company/users/${encodeURIComponent(uid)}`, {
      method: "DELETE",
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