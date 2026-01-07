// services\import-api\src\lib\schemas.ts

import { queryOne } from "./db.js"
import type { QueryResultRow } from "pg"

export type ImportSchemaRow = QueryResultRow & {
  import_type: string
  version: number
  canonical_fields: Record<string, any>
}

export async function getActiveSchema(importType: string): Promise<ImportSchemaRow> {
  const row = await queryOne<ImportSchemaRow>(
    `
    select import_type, version, canonical_fields
    from imports.import_schemas
    where import_type = $1
    order by version desc
    limit 1
    `,
    [importType]
  )

  if (!row) {
    const e: any = new Error(`No active schema for import_type=${importType}`)
    e.status = 404
    throw e
  }

  return row
}
