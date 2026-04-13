// services/import-worker/src/lib/parse.ts

import ExcelJS, { CellValue } from "exceljs"
import { downloadGs } from "./gcs.js"
import { query, queryOne } from "./db.js"

function cellToString(v: CellValue | null | undefined) {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v instanceof Date) return v.toISOString()
  try {
    return String((v as any)?.result ?? (v as any))
  } catch {
    return String(v as any)
  }
}

function isEmptyValue(v: unknown) {
  return v == null || v === "" || (typeof v === "string" && v.trim() === "")
}

function rowScore(row: ExcelJS.Row) {
  let nonEmpty = 0
  let stringLike = 0
  let numberLike = 0

  row.eachCell({ includeEmpty: false }, (cell) => {
    const raw = cell.value
    const s = cellToString(raw as any).trim()
    if (!s) return

    nonEmpty++
    if (typeof raw === "string") stringLike++
    else if (typeof raw === "number" || typeof raw === "boolean" || raw instanceof Date) numberLike++
    else stringLike++
  })

  const score = stringLike * 2 + nonEmpty - numberLike
  return { score, nonEmpty }
}

function findHeaderRowNumber(ws: ExcelJS.Worksheet, maxScan = 20) {
  // Recolectar primeras filas con eachRow para evitar depender de ws.rowCount
  const scannedRows: Array<{ rowNumber: number; row: ExcelJS.Row }> = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= maxScan) {
      scannedRows.push({ rowNumber, row })
    }
  })

  let bestRow = 1
  let bestScore = -Infinity

  for (const { rowNumber, row } of scannedRows) {
    const { score, nonEmpty } = rowScore(row)
    if (nonEmpty === 0) continue
    if (score > bestScore) {
      bestScore = score
      bestRow = rowNumber
    }
  }
  return bestRow
}

function columnHasData(ws: ExcelJS.Worksheet, col: number, startRow: number, endRow: number) {
  for (let r = startRow; r <= endRow; r++) {
    const v = ws.getRow(r).getCell(col).value
    if (!isEmptyValue(cellToString(v as any))) return true
  }
  return false
}

function dedupeHeaders(input: string[]) {
  const seen = new Map<string, number>()
  return input.map((h) => {
    const n = (seen.get(h) ?? 0) + 1
    seen.set(h, n)
    return n === 1 ? h : `${h} (${n})`
  })
}

type ColDef = { col: number; header: string }

function buildColumns(ws: ExcelJS.Worksheet, headerRowNumber: number): ColDef[] {
  const headerRow = ws.getRow(headerRowNumber)

  const values = (headerRow.values as CellValue[]) ?? []
  const maxCol = Math.max(
    ws.columnCount ?? 0,
    Math.max(0, values.length - 1),
    headerRow.cellCount ?? 0
  )

  const cols: ColDef[] = []
  // lookAheadEnd: usamos headerRowNumber + 5 directamente, sin depender de ws.rowCount
  const lookAheadEnd = headerRowNumber + 5

  for (let c = 1; c <= Math.max(maxCol, 1); c++) {
    const rawHeader = cellToString(headerRow.getCell(c).value).trim()

    if (rawHeader) {
      cols.push({ col: c, header: rawHeader })
      continue
    }

    if (columnHasData(ws, c, headerRowNumber + 1, lookAheadEnd)) {
      cols.push({ col: c, header: `Unnamed column ${c}` })
    }
  }

  const deduped = dedupeHeaders(cols.map((x) => x.header))
  return cols.map((x, i) => ({ ...x, header: deduped[i] }))
}

export async function processImport(importId: string) {
  let imp = null
  for (let attempt = 0; attempt < 6; attempt++) {
    imp = await queryOne(`select * from imports.imports where id=$1`, [importId])
    if (imp) break
    if (attempt < 5) await new Promise((r) => setTimeout(r, 500))
  }
  if (!imp) throw new Error("IMPORT_NOT_FOUND")

  const mappings = await query(
    `select source_column, canonical_field
     from imports.import_mappings
     where import_id=$1`,
    [importId]
  )

  const mapSourceToCanonical: Record<string, string> = {}
  for (const m of mappings) mapSourceToCanonical[m.source_column] = m.canonical_field

  const bytes = await downloadGs(imp.gcs_uri)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes as any)

  // Usa activeTab si existe
  const activeTab = (wb.views?.[0] as any)?.activeTab ?? 0
  const ws = wb.worksheets[activeTab] ?? wb.worksheets[0]
  if (!ws) throw new Error("No worksheet")

  const headerRowNumber = findHeaderRowNumber(ws, 20)
  const columns = buildColumns(ws, headerRowNumber)

  if (columns.length === 0) throw new Error("No headers detected")

  await query(`delete from staging.staging_rows where import_id=$1`, [importId])

  // ─────────────────────────────────────────────────────────────────────────
  // FIX: Usar ws.eachRow() en lugar de un for-loop con ws.rowCount.
  //
  // Los archivos exportados por Google Sheets/Forms NO incluyen el elemento
  // <dimension> en el XML de la hoja. Sin ese elemento, ExcelJS calcula
  // ws.rowCount de forma incorrecta y trunca la iteración (ej: reporta 288
  // filas cuando hay 336). ws.eachRow() itera sobre los objetos de fila ya
  // cargados en memoria, por lo que siempre cubre todas las filas reales.
  // ─────────────────────────────────────────────────────────────────────────
  const dataRows: Array<{ row: ExcelJS.Row; num: number }> = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber > headerRowNumber) {
      dataRows.push({ row, num: rowNumber })
    }
  })

  let inserted = 0
  let emptyStreak = 0

  for (const { row, num: r } of dataRows) {
    const raw: Record<string, any> = {}
    for (const c of columns) {
      raw[c.header] = row.getCell(c.col).value ?? null
    }

    const allEmpty = Object.values(raw).every((x) => isEmptyValue(x))
    if (allEmpty) {
      emptyStreak++
      // 50 filas vacías consecutivas = fin real del dataset
      if (emptyStreak >= 50) break
      continue
    }
    emptyStreak = 0

    const canonical: Record<string, any> = {}
    for (const [sourceHeader, value] of Object.entries(raw)) {
      const target = mapSourceToCanonical[sourceHeader]
      if (target) canonical[target] = value
    }

    await query(
      `insert into staging.staging_rows(import_id, row_number, data, is_valid)
       values ($1,$2,$3,true)`,
      [importId, r, canonical]
    )
    inserted++
  }

  await query(
    `update imports.imports set status='DONE', summary=$2, updated_at=now() where id=$1`,
    [importId, { insertedToStaging: inserted }]
  )
}