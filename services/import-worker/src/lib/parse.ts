// services\import-worker\src\lib\parse.ts

import ExcelJS, { CellValue } from "exceljs"
import { downloadGs } from "./gcs.js"
import { query, queryOne } from "./db.js"

function cellToString(v: CellValue | null | undefined) {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v instanceof Date) return v.toISOString()
  return String(v as any)
}

export async function processImport(importId: string) {
  const imp = await queryOne(`select * from imports.imports.imports where id=$1`, [importId])
  if (!imp) throw new Error("IMPORT_NOT_FOUND")

  const mappings = await query(
    `select source_column, canonical_field from import_mappings where import_id=$1`,
    [importId]
  )
  const map: Record<string, string> = {}
  for (const m of mappings) map[m.source_column] = m.canonical_field

  const bytes = await downloadGs(imp.gcs_uri)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes as any)

  const ws = wb.worksheets[0]
  if (!ws) throw new Error("No worksheet")

  const headerRow = ws.getRow(1)
  const headerValues = headerRow.values as CellValue[]
  const headers = headerValues.slice(1).map(v => cellToString(v).trim()).filter(Boolean)

  // Limpia staging previo si re-procesas
  await query(`delete from staging.staging_rows where import_id=$1`, [importId])

  let inserted = 0
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i)
    if (!row || row.cellCount === 0) continue

    const raw: Record<string, any> = {}
    headers.forEach((h, idx) => {
      raw[h] = row.getCell(idx + 1).value ?? null
    })

    const allNull = Object.values(raw).every(x => x == null || x === "")
    if (allNull) break

    // aplica mapping -> canonical
    const canonical: Record<string, any> = {}
    for (const [sourceHeader, value] of Object.entries(raw)) {
      const target = map[sourceHeader]
      if (target) canonical[target] = value
    }

    await query(
      `insert into staging.staging_rows(import_id, row_number, data, is_valid)
       values ($1,$2,$3,true)`,
      [importId, i, canonical]
    )
    inserted++
  }

  await query(
    `update imports.imports set status='DONE', summary=$2, updated_at=now() where id=$1`,
    [importId, { insertedToStaging: inserted }]
  )
}
