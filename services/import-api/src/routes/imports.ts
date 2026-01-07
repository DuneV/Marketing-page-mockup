// services/import-api/src/routes/import.ts

import { Router } from "express"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { createSignedUploadUrl } from "../lib/gcs.js"
import { query, queryOne } from "../lib/db.js"
import { analyzeExcelFromGcs } from "../lib/analyze.js"
import { getActiveSchema } from "../lib/schemas.js"
import { enqueueImport } from "../lib/pubsub.js"

export const importsRouter = Router()

importsRouter.post("/", async (req, res) => {
  try {
    const user = await requireAdmin(req)

    const { clientId, importType, filename } = req.body as {
      clientId: string
      importType: string
      filename: string
    }

    if (!clientId || !importType || !filename) {
      return res.status(400).json({ error: "Missing fields" })
    }
    if (!filename.toLowerCase().endsWith(".xlsx")) {
      return res.status(400).json({ error: "Only .xlsx allowed" })
    }

    // ✅ ahora solo 1 arg
    const schema = await getActiveSchema(importType)

    const importId = crypto.randomUUID()
    const safeFilename = filename.replace(/[^\w.\-() ]/g, "_")
    const objectPath = `imports/${clientId}/${importType}/${importId}-${safeFilename}`

    const uploadUrl = await createSignedUploadUrl(objectPath)
    const gcsUri = `gs://${process.env.GCS_BUCKET}/${objectPath}`

    // ✅ usa esquema imports.
    await query(
      `insert into imports.imports
        (id, company_id, import_type, schema_version, uploaded_by, original_filename, gcs_uri, status, created_at, updated_at)
       values
        ($1,$2,$3,$4,$5,$6,$7,'UPLOADED',now(),now())`,
      [importId, clientId, importType, schema.version, user.uid, safeFilename, gcsUri]
    )

    res.json({ importId, uploadUrl })
  } catch (e: any) {
    res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

importsRouter.post("/:id/analyze", async (req, res) => {
  try {
    await requireAdmin(req)
    const importId = req.params.id

    const imp = await queryOne<any>(`select * from imports.imports where id=$1`, [importId])
    if (!imp) return res.status(404).json({ error: "IMPORT_NOT_FOUND" })

    const schemaRow = await getActiveSchema(imp.import_type)

    // ✅ analyze espera schema con canonicalFields; adaptamos desde canonical_fields
    const schemaForAnalyzer = { canonicalFields: schemaRow.canonical_fields }

    const result = await analyzeExcelFromGcs(imp.gcs_uri, schemaForAnalyzer, 50)

    await query(
      `update imports.imports
       set summary=$2, status='ANALYZED', updated_at=now()
       where id=$1`,
      [importId, result]
    )

    res.json({ ...result, schema: schemaForAnalyzer })
  } catch (e: any) {
    res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

importsRouter.post("/:id/commit", async (req, res) => {
  try {
    const user = await requireAdmin(req)
    const importId = req.params.id
    const { mapping } = req.body as { mapping: Record<string, string> }

    const imp = await queryOne<any>(`select * from imports.imports where id=$1`, [importId])
    if (!imp) return res.status(404).json({ error: "IMPORT_NOT_FOUND" })

    await query(`delete from imports.import_mappings where import_id=$1`, [importId])

    for (const [source_column, canonical_field] of Object.entries(mapping ?? {})) {
      if (!canonical_field) continue
      await query(
        `insert into imports.import_mappings(import_id, source_column, canonical_field)
         values ($1,$2,$3)`,
        [importId, source_column, canonical_field]
      )
    }

    await query(`update imports.imports set status='PROCESSING', updated_at=now() where id=$1`, [importId])

    await enqueueImport(importId)

    res.json({ ok: true, by: user.uid })
  } catch (e: any) {
    res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})
