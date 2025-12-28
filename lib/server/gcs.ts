import { Storage } from "@google-cloud/storage"

export const storage = new Storage()
export const bucketName = process.env.GCS_BUCKET!

export function objectPathFromGsUri(gsUri: string) {
  // gs://bucket/path/to/file.xlsx
  const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!m) throw new Error(`Invalid gs uri: ${gsUri}`)
  const [, bucket, objectPath] = m
  return { bucket, objectPath }
}

export async function createSignedUploadUrl(
  objectPath: string,
  contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
) {
  if (!bucketName) throw new Error("Missing env GCS_BUCKET")
  const file = storage.bucket(bucketName).file(objectPath)

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 min
    contentType,
  })

  return url
}

export async function downloadFromGsUri(gsUri: string) {
  const { bucket, objectPath } = objectPathFromGsUri(gsUri)
  const file = storage.bucket(bucket).file(objectPath)
  const [buf] = await file.download()
  return buf
}
