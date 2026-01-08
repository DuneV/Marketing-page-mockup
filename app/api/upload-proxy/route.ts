// app/api/upload-proxy/route.ts

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get("x-upload-url")
    
    if (!uploadUrl) {
      return NextResponse.json({ error: "Missing upload URL" }, { status: 400 })
    }

    console.log("📤 Proxying upload to GCS")

    const body = await request.arrayBuffer()

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body,
    })

    console.log("📥 GCS response:", {
      status: response.status,
      statusText: response.statusText
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ GCS upload failed:", errorText)
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ Proxy error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}