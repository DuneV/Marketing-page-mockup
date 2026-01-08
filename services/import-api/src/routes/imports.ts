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

    const { companyId, importType, filename } = req.body as {
      companyId: string
      importType: string
      filename: string
    }

    console.log("📥 Request body:", { companyId, importType, filename })

    if (!companyId || !importType || !filename) {
      return res.status(400).json({ 
        error: "Missing required fields: companyId, importType, filename",
        received: { companyId, importType, filename }
      })
    }
    
    if (!filename.toLowerCase().endsWith(".xlsx")) {
      return res.status(400).json({ error: "Only .xlsx allowed" })
    }

    // ✅ Usar "name" no "nombre"
    const company = await queryOne(
      `SELECT id, name FROM marketing.companies WHERE id = $1`, 
      [companyId]
    )
    
    console.log("🏢 Company lookup result:", company)
    
    if (!company) {
      return res.status(400).json({ 
        error: "Company not found",
        companyId 
      })
    }

    const schema = await getActiveSchema(importType)

    const importId = crypto.randomUUID()
    const safeFilename = filename.replace(/[^\w.\-() ]/g, "_")
    const objectPath = `imports/${companyId}/${importType}/${importId}-${safeFilename}`

    const uploadUrl = await createSignedUploadUrl(objectPath)
    const gcsUri = `gs://${process.env.GCS_BUCKET}/${objectPath}`

    console.log("💾 Inserting import record:", {
      importId,
      companyId,
      companyName: company.name,  // ✅ Ahora company.name existe
      importType,
      schemaVersion: schema.version,
      uploadedBy: user.uid
    })

    await query(
      `INSERT INTO imports.imports
        (id, company_id, import_type, schema_version, uploaded_by, original_filename, gcs_uri, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'UPLOADED', now(), now())`,
      [importId, companyId, importType, schema.version, user.uid, safeFilename, gcsUri]
    )

    console.log("✅ Import created successfully:", importId)

    res.json({ importId, uploadUrl })
  } catch (e: any) {
    console.error("❌ Error creating import:", e)
    res.status(e?.status ?? 500).json({ 
      error: e?.message ?? "Internal server error",
      details: e?.toString()
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

    res.json({ ...result, schema: schemaForAnalyzer })
  } catch (e: any) {
    console.error("❌ Error analyzing import:", e)
    res.status(e?.status ?? 500).json({ 
      error: e?.message ?? "error",
      details: e?.toString()
    })
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

    res.json({ ok: true, by: user.uid })
  } catch (e: any) {
    console.error("❌ Error committing import:", e)
    res.status(e?.status ?? 500).json({ 
      error: e?.message ?? "error",
      details: e?.toString()
    })
  }
})