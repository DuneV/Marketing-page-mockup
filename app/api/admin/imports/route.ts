export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/firebase-admin"
import { createSignedUploadUrl } from "@/lib/server/gcs"
import { query } from "@/lib/server/db"

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req)
    const body = await req.json()
    const { clientId, importType, filename } = body as {
      clientId: string
      importType: string
      filename: string
    }

    if (!clientId || !importType || !filename) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // ✅ (Recomendado) validar extensión
    if (!filename.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx allowed" }, { status: 400 })
    }

    // TODO: resolver versión activa desde import_schemas (por ahora fijo)
    const schemaVersion = 1

    const importId = crypto.randomUUID()
    const safeFilename = filename.replace(/[^\w.\-() ]/g, "_")
    const objectPath = `imports/${clientId}/${importType}/${importId}-${safeFilename}`

    const uploadUrl = await createSignedUploadUrl(objectPath)
    const gcsUri = `gs://${process.env.GCS_BUCKET}/${objectPath}`

    // SQL parametrizado --- NO SQL injection
    await query(
      `
      insert into imports
        (id, client_id, import_type, schema_version, uploaded_by, original_filename, gcs_uri, status, created_at, updated_at)
      values
        ($1, $2, $3, $4, $5, $6, $7, 'UPLOADED', now(), now())
      `,
      [importId, clientId, importType, schemaVersion, user.uid, safeFilename, gcsUri]
    )

    return NextResponse.json({ importId, uploadUrl })
  } catch (e: any) {
    const status = e?.status ?? 500
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status })
  }
}
