// services/import-api/src/routes/admin-schemas.ts
import { Router } from "express"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { query, queryOne } from "../lib/db.js"

export const adminSchemasRouter = Router()

type CanonicalSqlType = "string" | "number" | "date" | "boolean" | "image" | "text"

function normalizeName(name: string) {
  return name.trim()
}

function isValidFieldName(name: string) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

/**
 * GET /admin/schemas/:importType
 * Devuelve schema activo (por simplicidad: version=1; si ya manejas active schema, ajústalo).
 */

adminSchemasRouter.get("/:importType", async (req, res) => {
  try {
    await requireAdmin(req)
    const { importType } = req.params

    const row = await queryOne<{ import_type: string; version: number; canonical_fields: any }>(
      `SELECT import_type, version, canonical_fields
       FROM imports.import_schemas
       WHERE import_type = $1
       ORDER BY version DESC
       LIMIT 1`,
      [importType]
    )

    if (!row) return res.status(404).json({ error: "SCHEMA_NOT_FOUND" })

    const canonical_fields = typeof row.canonical_fields === "string"
      ? JSON.parse(row.canonical_fields)
      : (row.canonical_fields ?? {})

    return res.json({
      importType: row.import_type,
      version: row.version,
      canonical_fields,
    })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

/**
 * POST /admin/schemas/:importType/canonical-fields
 * Body: { name: string, type: CanonicalSqlType }
 * Agrega un canonical field al schema.
 *
 * Nota: Lo más seguro es crear NUEVA version, pero para arrancar, actualizamos la última.
 * Si quieres versionado, te dejo nota al final.
 */

adminSchemasRouter.post("/:importType/canonical-fields", async (req, res) => {
  try {
    await requireAdmin(req)
    const { importType } = req.params
    const nameRaw = String(req.body?.name ?? "")
    const type = String(req.body?.type ?? "") as CanonicalSqlType

    const name = normalizeName(nameRaw)

    if (!name) return res.status(400).json({ error: "MISSING_NAME" })
    if (!isValidFieldName(name)) return res.status(400).json({ error: "INVALID_FIELD_NAME" })
    if (!["string", "number", "date", "boolean", "image", "text"].includes(type)) {
      return res.status(400).json({ error: "INVALID_TYPE" })
    }

    const row = await queryOne<{ id?: string; version: number; canonical_fields: any }>(
      `SELECT version, canonical_fields
       FROM imports.import_schemas
       WHERE import_type = $1
       ORDER BY version DESC
       LIMIT 1`,
      [importType]
    )

    if (!row) return res.status(404).json({ error: "SCHEMA_NOT_FOUND" })

    const canonical_fields: Record<string, any> =
      typeof row.canonical_fields === "string"
        ? JSON.parse(row.canonical_fields)
        : (row.canonical_fields ?? {})

    if (canonical_fields[name]) {
      return res.status(409).json({ error: "FIELD_ALREADY_EXISTS" })
    }

    canonical_fields[name] = { type }

    // update the last version
    await query(
      `UPDATE imports.import_schemas
       SET canonical_fields = $2
       WHERE import_type = $1 AND version = $3`,
      [importType, JSON.stringify(canonical_fields), row.version]
    )

    return res.json({ ok: true, name, type })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})
