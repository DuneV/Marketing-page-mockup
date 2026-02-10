import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function POST(req: Request, ctx: { params: Promise<{ importId: string }> }) {
  try {
    if (!BASE) return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    const auth = passthroughAuth(req)
    const { importId } = await ctx.params

    const upstream = await fetch(`${BASE}/imports/${importId}/commit-from-previous`, {
      method: "POST",
      headers: { Authorization: auth },
    })

    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}
