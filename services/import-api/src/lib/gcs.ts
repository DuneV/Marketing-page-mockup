// services/import-api/src/lib/gcs.ts

import { Storage } from "@google-cloud/storage"

export const storage = new Storage()
export const bucketName = process.env.GCS_BUCKET!

export async function createSignedUploadUrl(objectPath: string) {
  const file = storage.bucket(bucketName).file(objectPath)
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  return url
}

export async function downloadGs(gsUri: string) {
  try {
    console.log("📥 downloadGs called with:", gsUri)
    
    const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
    if (!m) {
      throw new Error(`Invalid gs:// URI format: ${gsUri}`)
    }
    
    const [, bucket, objectPath] = m
    console.log("📦 Downloading from bucket:", bucket, "path:", objectPath)
    
    const [buf] = await storage.bucket(bucket).file(objectPath).download()
    
    console.log("✅ Download successful, size:", buf.length)
    
    // evitar líos de Buffer genérico:
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf as any)
  } catch (error: any) {
    console.error("❌ Error in downloadGs:", error)
    console.error("Error message:", error.message)
    throw error
  }
}
/** NUEVO: subir JSON a tu bucket principal */
export async function uploadJson(objectPath: string, json: any) {
  const file = storage.bucket(bucketName).file(objectPath)
  const body = JSON.stringify(json, null, 2)

  await file.save(body, {
    contentType: "application/json",
    resumable: false,
    metadata: {
      cacheControl: "no-cache",
    },
  })

  return `gs://${bucketName}/${objectPath}`
}

/** NUEVO: bajar JSON desde gs:// y parsearlo */
export async function downloadJson(gsUri: string) {
  const buf = await downloadGs(gsUri)
  const text = new TextDecoder("utf-8").decode(buf)
  return JSON.parse(text)
}

export async function deleteJson(gsUriOrPath: string) {
  // Acepta:
  //  - "gs://bucket/path/file.json"
  //  - "path/file.json" (asume bucketName)
  let bucket = bucketName
  let objectPath = gsUriOrPath

  if (typeof gsUriOrPath === "string" && gsUriOrPath.startsWith("gs://")) {
    const without = gsUriOrPath.slice("gs://".length) // bucket/path
    const firstSlash = without.indexOf("/")
    bucket = without.slice(0, firstSlash)
    objectPath = without.slice(firstSlash + 1)
  }

  // ignoreNotFound evita que falle si no existe
  await storage.bucket(bucket).file(objectPath).delete({ ignoreNotFound: true })

  return { ok: true, bucket, objectPath }
}