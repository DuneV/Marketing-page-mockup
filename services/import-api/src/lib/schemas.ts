import { queryOne } from "./db.js"

export async function getActiveSchema(clientId: string, importType: string) {
  const row = await queryOne<{ schema_json: any; version: number }>(
    `select schema_json, version
     from import_schemas
     where client_id=$1 and import_type=$2 and is_active=true
     order by version desc
     limit 1`,
    [clientId, importType]
  )
  if (!row) throw new Error("SCHEMA_NOT_FOUND")
  return row
}
