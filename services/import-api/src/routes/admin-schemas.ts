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

// PUT /admin/schemas/:importType/canonical-fields/:name
// Body opcional: { name?: string, type?: CanonicalSqlType }
// - Si viene body.name, renombra el campo
// - Si viene body.type, actualiza el type
adminSchemasRouter.put("/:importType/canonical-fields/:name", async (req, res) => {
  try {
    await requireAdmin(req)

    const { importType, name: currentNameParam } = req.params

    const currentName = normalizeName(String(currentNameParam ?? ""))
    const nextNameRaw = req.body?.name
    const nextTypeRaw = req.body?.type

    const nextName = nextNameRaw != null ? normalizeName(String(nextNameRaw)) : null
    const nextType = nextTypeRaw != null ? (String(nextTypeRaw) as CanonicalSqlType) : null

    if (!currentName) return res.status(400).json({ error: "MISSING_CURRENT_NAME" })
    if (!isValidFieldName(currentName)) return res.status(400).json({ error: "INVALID_CURRENT_FIELD_NAME" })

    if (nextName !== null) {
      if (!nextName) return res.status(400).json({ error: "MISSING_NAME" })
      if (!isValidFieldName(nextName)) return res.status(400).json({ error: "INVALID_FIELD_NAME" })
    }

    if (nextType !== null) {
      if (!["string", "number", "date", "boolean", "image", "text"].includes(nextType)) {
        return res.status(400).json({ error: "INVALID_TYPE" })
      }
    }

    const row = await queryOne<{ version: number; canonical_fields: any }>(
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

    if (!canonical_fields[currentName]) {
      return res.status(404).json({ error: "FIELD_NOT_FOUND" })
    }

    // Determina target final
    const finalName = nextName ?? currentName

    // Si renombra y ya existe, error
    if (finalName !== currentName && canonical_fields[finalName]) {
      return res.status(409).json({ error: "FIELD_ALREADY_EXISTS" })
    }

    const existingMeta = canonical_fields[currentName] ?? {}
    const updatedMeta = {
      ...existingMeta,
      ...(nextType ? { type: nextType } : {}),
    }

    // Si cambia el nombre, mueve la key
    if (finalName !== currentName) {
      delete canonical_fields[currentName]
      canonical_fields[finalName] = updatedMeta
    } else {
      canonical_fields[currentName] = updatedMeta
    }

    await query(
      `UPDATE imports.import_schemas
       SET canonical_fields = $2
       WHERE import_type = $1 AND version = $3`,
      [importType, JSON.stringify(canonical_fields), row.version]
    )

    return res.json({
      ok: true,
      importType,
      version: row.version,
      name: finalName,
      type: updatedMeta.type ?? null,
      renamed: finalName !== currentName,
    })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

// DELETE /admin/schemas/:importType/canonical-fields/:name
adminSchemasRouter.delete("/:importType/canonical-fields/:name", async (req, res) => {
  try {
    await requireAdmin(req)

    const { importType, name: nameParam } = req.params
    const name = normalizeName(String(nameParam ?? ""))

    if (!name) return res.status(400).json({ error: "MISSING_NAME" })
    if (!isValidFieldName(name)) return res.status(400).json({ error: "INVALID_FIELD_NAME" })

    const row = await queryOne<{ version: number; canonical_fields: any }>(
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

    if (!canonical_fields[name]) {
      return res.status(404).json({ error: "FIELD_NOT_FOUND" })
    }

    delete canonical_fields[name]

    await query(
      `UPDATE imports.import_schemas
       SET canonical_fields = $2
       WHERE import_type = $1 AND version = $3`,
      [importType, JSON.stringify(canonical_fields), row.version]
    )

    return res.json({ ok: true, importType, version: row.version, name })
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})