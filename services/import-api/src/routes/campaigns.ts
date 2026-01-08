// services/import-api/src/routes/campaigns.ts

import { Router } from "express"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { query, queryOne } from "../lib/db.js"

export const campaignsRouter = Router()

type AvailableFieldType = "number" | "text" | "date" | "boolean" | "unknown"

function inferTypeFromSamples(samples: any[]): AvailableFieldType {
  if (!samples || samples.length === 0) return "unknown"

  const first = samples[0]

  if (typeof first === "number") return "number"
  if (typeof first === "boolean") return "boolean"
  if (first instanceof Date) return "date"

  if (typeof first === "string") {
    // ExcelJS a veces trae fechas como string ISO (por tu cellToString en worker)
    const datePattern = /^\d{4}-\d{2}-\d{2}/
    if (datePattern.test(first)) return "date"

    // números que vienen como string
    if (!isNaN(Number(first))) return "number"

    return "text"
  }

  return "text"
}

// Obtener campos disponibles para una campaña (vía imports.tag campaign_id)
campaignsRouter.get("/:campaignId/available-fields", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params

    console.log("📌 Getting available fields for campaign:", campaignId)

    // 1) Buscar último import DONE para esa campaña
    const lastImport = await queryOne<any>(
      `SELECT id, status, summary
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
         AND status = 'DONE'
       ORDER BY created_at DESC
       LIMIT 1`,
      [campaignId]
    )

    if (!lastImport) {
      return res.json({ fields: [], importId: null })
    }

    console.log("Last import found:", lastImport.id)

    // 2) Campos canónicos mapeados en ese import
    const mappings = await query<{ canonical_field: string }>(
      `SELECT DISTINCT canonical_field
       FROM imports.import_mappings
       WHERE import_id = $1
       ORDER BY canonical_field`,
      [lastImport.id]
    )

    if (mappings.length === 0) {
      return res.json({ fields: [], importId: lastImport.id })
    }

    console.log("Canonical fields found:", mappings.map(m => m.canonical_field))

    // 3) Muestra de datos staging
    const sampleRows = await query<{ data: any }>(
      `SELECT data
       FROM staging.staging_rows
       WHERE import_id = $1
         AND is_valid = true
       LIMIT 100`,
      [lastImport.id]
    )

    console.log("Sample rows retrieved:", sampleRows.length)

    // 4) Inferir tipos
    const fieldTypes: Record<string, AvailableFieldType> = {}

    for (const m of mappings) {
      const fieldName = m.canonical_field
      const samples = sampleRows
        .map(r => r.data?.[fieldName])
        .filter(v => v != null && v !== "")

      fieldTypes[fieldName] = inferTypeFromSamples(samples)
    }

    console.log("Field types inferred:", fieldTypes)

    // 5) Construir respuesta
    const fields = mappings.map(m => {
      const name = m.canonical_field
      const sampleCount = sampleRows.filter(r => r.data?.[name] != null && r.data?.[name] !== "").length
      return {
        name,
        type: fieldTypes[name] ?? "unknown",
        sampleCount,
      }
    })

    return res.json({ fields, importId: lastImport.id })
  } catch (e: any) {
    console.error("Error getting available fields:", e)
    return res.status(500).json({
      error: e?.message ?? "error",
      details: e?.toString?.() ?? String(e),
    })
  }
})
