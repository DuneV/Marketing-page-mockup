import { Router } from "express"
import crypto from "crypto"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { bucketName, createSignedUploadUrl, createSignedReadUrlFromGs } from "../lib/gcs.js"

export const assetsRouter = Router()

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

function safeName(filename: string) {
  return filename.replace(/[^\w.\-() ]/g, "_")
}

assetsRouter.post("/upload-url", async (req, res) => {
  try {
    await requireAdmin(req)

    const { companyId, campaignId, filename, contentType } = req.body as {
      companyId: string
      campaignId?: string
      filename: string
      contentType: string
    }

    if (!companyId || !filename || !contentType) {
      return res.status(400).json({ error: "Missing companyId, filename, contentType" })
    }

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return res.status(400).json({ error: "Invalid contentType", allowed: Array.from(ALLOWED_IMAGE_TYPES) })
    }

    const id = crypto.randomUUID()
    const objectPath = `assets/${companyId}/campaigns/${campaignId ?? "no_campaign"}/${id}-${safeName(filename)}`
    const uploadUrl = await createSignedUploadUrl(objectPath, contentType)
    const gcsUri = `gs://${bucketName}/${objectPath}`

    return res.json({ uploadUrl, gcsUri })
  } catch (e: any) {
    console.error("❌ /assets/upload-url error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

assetsRouter.get("/read-url", async (req, res) => {
  try {
    await requireAdmin(req)

    const gsUri = String(req.query.gsUri ?? "")
    const expiresMinutes = Number(req.query.expiresMinutes ?? "60")

    if (!gsUri.startsWith("gs://")) {
      return res.status(400).json({ error: "gsUri must start with gs://" })
    }

    const url = await createSignedReadUrlFromGs(gsUri, expiresMinutes)
    return res.json({ url })
  } catch (e: any) {
    console.error("❌ /assets/read-url error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})