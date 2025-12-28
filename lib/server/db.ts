import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

export const pool =
  global.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Si usas Cloud SQL con SSL, ajustas aquí:
    // ssl: { rejectUnauthorized: false }
  })

if (process.env.NODE_ENV !== "production") global.__pgPool = pool

export async function query<T = any>(text: string, params: any[] = []) {
  const res = await pool.query<T>(text, params)
  return res.rows
}

export async function queryOne<T = any>(text: string, params: any[] = []) {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

// Tipos y helpers mínimos para imports
export type ImportRow = {
  id: string
  client_id: string
  import_type: string
  schema_version: number
  uploaded_by: string
  original_filename: string
  gcs_uri: string
  status: string
  analyze_result: any
}

export async function getImportById(id: string) {
  const row = await queryOne<ImportRow>(`select * from imports where id = $1`, [id])
  if (!row) throw new Error("IMPORT_NOT_FOUND")
  return row
}

export async function getActiveSchema(clientId: string, importType: string) {
  const row = await queryOne<{ schema_json: any; version: number }>(
    `
    select schema_json, version
    from import_schemas
    where client_id = $1 and import_type = $2 and is_active = true
    order by version desc
    limit 1
  `,
    [clientId, importType]
  )
  if (!row) throw new Error("SCHEMA_NOT_FOUND")
  return row
}

export async function updateImportAnalyzeResult(importId: string, analyzeResult: any) {
  await query(
    `update imports set analyze_result = $2, status = 'ANALYZED', updated_at = now() where id = $1`,
    [importId, analyzeResult]
  )
}

export async function saveMapping(importId: string, mapping: Record<string, string>) {
  // borra y vuelve a insertar (simple)
  await query(`delete from import_mappings where import_id = $1`, [importId])

  const entries = Object.entries(mapping).filter(([, canonical]) => canonical)
  for (const [source_column, canonical_field] of entries) {
    await query(
      `insert into import_mappings(import_id, source_column, canonical_field) values ($1,$2,$3)`,
      [importId, source_column, canonical_field]
    )
  }
}
