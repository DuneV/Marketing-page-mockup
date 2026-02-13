import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
])

export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get("x-upload-url")
    if (!uploadUrl) {
      return NextResponse.json({ error: "Missing upload URL" }, { status: 400 })
    }

    const contentType =
      request.headers.get("x-content-type") ??
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    if (!ALLOWED.has(contentType)) {
      return NextResponse.json(
        { error: `Content-Type not allowed: ${contentType}` },
        { status: 400 }
      )
    }

    const body = await request.arrayBuffer()

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}