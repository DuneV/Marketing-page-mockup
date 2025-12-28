import { Storage } from "@google-cloud/storage"

export const storage = new Storage()
export const bucketName = process.env.GCS_BUCKET!

export async function downloadGs(gsUri: string): Promise<Uint8Array> {
  const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!m) throw new Error(`Invalid gs uri: ${gsUri}`)
  const [, bucket, objectPath] = m
  const [buf] = await storage.bucket(bucket).file(objectPath).download()
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf as any)
}
