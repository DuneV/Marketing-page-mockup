// services\import-api\src\lib\gcs.ts

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
  const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!m) throw new Error("Invalid gs uri")
  const [, bucket, objectPath] = m
  const [buf] = await storage.bucket(bucket).file(objectPath).download()
  // evitar líos de Buffer genérico:
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf as any)
}
