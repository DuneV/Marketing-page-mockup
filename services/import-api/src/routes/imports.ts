// services/import-api/src/routes/imports.ts
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

    const { companyId, importType, filename, campaignId, sourceLabel } = req.body as {
      companyId: string
      importType: string
      filename: string
      campaignId?: string
      sourceLabel?: string
    }
    const resolvedSourceLabel = sourceLabel?.trim() || "primary"

    if (!companyId || !importType || !filename) {
      return res.status(400).json({
        error: "Missing required fields: companyId, importType, filename",
        received: { companyId, importType, filename },
      })
    }

    if (!filename.toLowerCase().endsWith(".xlsx")) {
      return res.status(400).json({ error: "Only .xlsx allowed" })
    }

    const company = await queryOne(
      `SELECT id, name FROM marketing.companies WHERE id = $1`,
      [companyId]
    )

    if (!company) {
      return res.status(400).json({ error: "Company not found", companyId })
    }

    const schema = await getActiveSchema(importType)

    const importId = crypto.randomUUID()
    const safeFilename = filename.replace(/[^\w.\-() ]/g, "_")
    const objectPath = `imports/${companyId}/${importType}/${importId}-${safeFilename}`

    const uploadUrl = await createSignedUploadUrl(objectPath)
    const gcsUri = `gs://${process.env.GCS_BUCKET}/${objectPath}`

    await query(
      `INSERT INTO imports.imports
        (id, company_id, campaign_id, import_type, schema_version, uploaded_by, original_filename, gcs_uri, status, source_label, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, 'UPLOADED', $9, now(), now())`,
      [importId, companyId, campaignId ?? null, importType, schema.version, user.uid, safeFilename, gcsUri, resolvedSourceLabel]
    )

    return res.json({ importId, uploadUrl })
  } catch (e: any) {
    console.error("❌ Error creating import:", e)
    return res.status(e?.status ?? 500).json({
      error: e?.message ?? "Internal server error",
      details: e?.toString(),
    })
  }
})

importsRouter.post("/:id/analyze", async (req, res) => {
  try {
    await requireAdmin(req)
    const importId = req.params.id

    const imp = await queryOne<any>(`SELECT * FROM imports.imports WHERE id=$1`, [importId])
    if (!imp) return res.status(404).json({ error: "IMPORT_NOT_FOUND" })

    const schemaRow = await getActiveSchema(imp.import_type)
    const schemaForAnalyzer = { canonicalFields: schemaRow.canonical_fields }

    const result = await analyzeExcelFromGcs(imp.gcs_uri, schemaForAnalyzer, 50)

    await query(
      `UPDATE imports.imports
       SET summary=$2, status='ANALYZED', updated_at=now()
       WHERE id=$1`,
      [importId, result]
    )

    return res.json({ ...result, schema: schemaForAnalyzer })
  } catch (e: any) {
    console.error("❌ Error analyzing import:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error", details: e?.toString() })
  }
})

importsRouter.post("/:id/commit", async (req, res) => {
  try {
    const user = await requireAdmin(req)
    const importId = req.params.id
    const { mapping } = req.body as { mapping: Record<string, string> }

    const imp = await queryOne<any>(`SELECT * FROM imports.imports WHERE id=$1`, [importId])
    if (!imp) return res.status(404).json({ error: "IMPORT_NOT_FOUND" })

    await query(`DELETE FROM imports.import_mappings WHERE import_id=$1`, [importId])

    for (const [source_column, canonical_field] of Object.entries(mapping ?? {})) {
      if (!canonical_field) continue
      await query(
        `INSERT INTO imports.import_mappings(import_id, source_column, canonical_field)
         VALUES ($1,$2,$3)`,
        [importId, source_column, canonical_field]
      )
    }

    await query(`UPDATE imports.imports SET status='PROCESSING', updated_at=now() WHERE id=$1`, [importId])

    await enqueueImport(importId)

    return res.json({ ok: true, by: user.uid })
  } catch (e: any) {
    console.error("❌ Error committing import:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error", details: e?.toString() })
  }
})

/**
 * NUEVO: POST /imports/:id/commit-from-previous
 * - Copia mappings del último import anterior (misma campaign_id + import_type)
 * - Pasa a PROCESSING y encola
 */
importsRouter.post("/:id/commit-from-previous", async (req, res) => {
  try {
    const user = await requireAdmin(req)
    const importId = req.params.id

    const current = await queryOne<any>(
      `SELECT id, campaign_id, import_type, source_label
       FROM imports.imports
       WHERE id = $1`,
      [importId]
    )
    if (!current) return res.status(404).json({ error: "IMPORT_NOT_FOUND" })
    if (!current.campaign_id) return res.status(400).json({ error: "IMPORT_HAS_NO_CAMPAIGN_ID" })

    const prev = await queryOne<any>(
      `SELECT id
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = $2
         AND source_label = $3
         AND id <> $4
       ORDER BY created_at DESC
       LIMIT 1`,
      [current.campaign_id, current.import_type, current.source_label ?? "primary", importId]
    )

    if (!prev) {
      return res.status(409).json({
        error: "NO_PREVIOUS_IMPORT",
        message: "No existe un import anterior para copiar mapping. Debes mapear manualmente.",
      })
    }

    const prevMappings = await query<{ source_column: string; canonical_field: string }>(
      `SELECT source_column, canonical_field
       FROM imports.import_mappings
       WHERE import_id = $1`,
      [prev.id]
    )

    if (prevMappings.length === 0) {
      return res.status(409).json({
        error: "NO_PREVIOUS_MAPPING",
        message: "El import anterior no tiene mappings. Debes mapear manualmente.",
      })
    }

    await query(`DELETE FROM imports.import_mappings WHERE import_id = $1`, [importId])

    for (const m of prevMappings) {
      await query(
        `INSERT INTO imports.import_mappings(import_id, source_column, canonical_field)
         VALUES ($1, $2, $3)`,
        [importId, m.source_column, m.canonical_field]
      )
    }

    await query(
      `UPDATE imports.imports
       SET status='PROCESSING', updated_at=now()
       WHERE id=$1`,
      [importId]
    )

    await enqueueImport(importId)

    return res.json({
      ok: true,
      importId,
      copiedFromImportId: prev.id,
      mappingsCopied: prevMappings.length,
      by: user.uid,
    })
  } catch (e: any) {
    console.error("commit-from-previous error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error", details: e?.toString() })
  }
})

importsRouter.get("/campaigns/:campaignId", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params

    const rows = await query<any>(
      `
      SELECT
        id,
        company_id,
        campaign_id,
        import_type,
        schema_version,
        uploaded_by,
        original_filename,
        gcs_uri,
        status,
        source_label,
        created_at,
        updated_at,
        summary
      FROM imports.imports
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [campaignId]
    )

    res.json({ imports: rows })
  } catch (e: any) {
    res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

importsRouter.get("/:id", async (req, res) => {
  try {
    await requireAdmin(req)
    const importId = req.params.id

    const imp = await queryOne<any>(
      `SELECT * FROM imports.imports WHERE id = $1`,
      [importId]
    )

    if (!imp) return res.status(404).json({ error: "IMPORT_NOT_FOUND" })
    res.json(imp)
  } catch (e: any) {
    res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})