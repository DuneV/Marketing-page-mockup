export const runtime = "nodejs"

import { NextResponse } from "next/server"

function parseGoogleSheetUrl(sheetUrl: string) {
  const u = new URL(sheetUrl)
  const m = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!m) throw new Error("URL de Google Sheets inválida")

  const spreadsheetId = m[1]
  const gid =
    u.searchParams.get("gid") ??
    (u.hash.match(/gid=(\d+)/)?.[1] ?? null)

  return { spreadsheetId, gid }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sheetUrl = url.searchParams.get("url")
    const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase()

    if (!sheetUrl) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 })
    }

    const { spreadsheetId, gid } = parseGoogleSheetUrl(sheetUrl)

    const exportUrl =
      format === "csv" && gid
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
        : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`

    const upstream = await fetch(exportUrl, { redirect: "follow" })

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json(
        { error: "Failed to export Google Sheet", details: text },
        { status: upstream.status }
      )
    }

    const outHeaders = new Headers()
    outHeaders.set(
      "content-type",
      upstream.headers.get("content-type") ??
        (format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    )
    outHeaders.set(
      "content-disposition",
      `attachment; filename="google-sheet.${format === "csv" ? "csv" : "xlsx"}"`
    )
    outHeaders.set("cache-control", "no-store")

    return new NextResponse(upstream.body, {
      status: 200,
      headers: outHeaders,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 })
  }
}