// app/api/assets/upload-url/route.ts
import { NextResponse } from "next/server"

const BASE = process.env.IMPORT_API_BASE_URL

function passthroughAuth(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth) throw new Error("Missing Authorization header")
  return auth
}

export async function POST(req: Request) {
  try {
    if (!BASE) {
      return NextResponse.json({ error: "Missing IMPORT_API_BASE_URL" }, { status: 500 })
    }

    const auth = passthroughAuth(req)
    const body = await req.json()

    const upstream = await fetch(`${BASE}/assets/upload-url`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()

    return NextResponse.json(data, {
      status: upstream.status,
    })
  } catch (e: any) {
    console.error("Error in assets/upload-url proxy:", e)
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}