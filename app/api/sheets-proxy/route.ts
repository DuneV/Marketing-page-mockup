// app/api/sheets-proxy/route.ts
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 })
    }

    // seguridad mínima: solo permitir export de Google Sheets
    if (!url.startsWith("https://docs.google.com/spreadsheets/d/")) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 })
    }

    const r = await fetch(url, { redirect: "follow" })
    if (!r.ok) {
      const txt = await r.text()
      return NextResponse.json({ error: "Fetch failed", details: txt }, { status: 500 })
    }

    const arrayBuffer = await r.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Proxy error" },
      { status: 500 }
    )
  }
}