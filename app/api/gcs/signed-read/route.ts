// app/api/gcs/signed-read/route.ts
import { NextRequest, NextResponse } from "next/server"
import { Storage } from "@google-cloud/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const storage = new Storage()

function parseGsUri(gsUri: string) {
  const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!m) throw new Error(`Invalid gs:// URI format: ${gsUri}`)
  const [, bucket, objectPath] = m
  return { bucket, objectPath }
}

export async function GET(req: NextRequest) {
  const gsUri = req.nextUrl.searchParams.get("gsUri")
  if (!gsUri) return NextResponse.json({ error: "Missing gsUri" }, { status: 400 })

  const { bucket, objectPath } = parseGsUri(gsUri)
  const file = storage.bucket(bucket).file(objectPath)

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 60 min
  })

  return NextResponse.json({ url })
}