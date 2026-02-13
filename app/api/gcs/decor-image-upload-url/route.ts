// app/api/gcs/decor-image-upload-url/route.ts
import { NextRequest, NextResponse } from "next/server"
import { Storage } from "@google-cloud/storage"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET!

export async function POST(req: NextRequest) {
  const { dashboardId, filename } = await req.json().catch(() => ({}))

  if (!dashboardId) return NextResponse.json({ error: "Missing dashboardId" }, { status: 400 })

  const safeName = (typeof filename === "string" ? filename : "decor.png").replace(/[^\w.\-]+/g, "_")
  const id = crypto.randomUUID()
  const objectPath = `dashboards/${dashboardId}/assets/${id}-${safeName}`

  const file = storage.bucket(bucketName).file(objectPath)

  // Firmamos para PNG
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: "image/png",
  })

  const gsUri = `gs://${bucketName}/${objectPath}`

  return NextResponse.json({ uploadUrl, gsUri, objectPath, contentType: "image/png" })
}