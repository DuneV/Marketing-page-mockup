// services/import-api/src/lib/analyze.ts

import ExcelJS, { CellValue } from "exceljs"
import { downloadGs } from "./gcs.js"

type AnalyzeResult = {
  headers: string[]
  previewRows: Record<string, unknown>[]
  suggestions: Record<string, string>
  missingRequired: string[]
  extraColumns: string[]
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

function vToString(v: CellValue | null | undefined) {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v instanceof Date) return v.toISOString()
  // ExcelJS puede traer objetos (formula/richText/etc.)
  try {
    return String((v as any)?.result ?? v as any)
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
    const s = vToString(raw as any).trim()
    if (!s) return

    nonEmpty++
    if (typeof raw === "string") stringLike++
    else if (typeof raw === "number" || typeof raw === "boolean" || raw instanceof Date) numberLike++
    else stringLike++
  })

  // headers suelen ser "más texto que números"
  const score = stringLike * 2 + nonEmpty - numberLike
  return { score, nonEmpty, stringLike, numberLike }
}

function findHeaderRowNumber(ws: ExcelJS.Worksheet, maxScan = 20) {
  const scanLimit = Math.min(ws.rowCount || 0, maxScan)
  let bestRow = 1
  let bestScore = -Infinity

  for (let r = 1; r <= Math.max(scanLimit, 1); r++) {
    const row = ws.getRow(r)
    const { score, nonEmpty } = rowScore(row)

    // ignora filas completamente vacías
    if (nonEmpty === 0) continue

    if (score > bestScore) {
      bestScore = score
      bestRow = r
    }
  }

  return bestRow
}
function columnHasData(ws: ExcelJS.Worksheet, col: number, startRow: number, endRow: number) {
  for (let r = startRow; r <= endRow; r++) {
    const v = ws.getRow(r).getCell(col).value
    if (!isEmptyValue(vToString(v as any))) return true
  }
  return false
}

function dedupeHeaders(input: string[]) {
  const seen = new Map<string, number>()
  return input.map((h) => {
    const key = h
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    return n === 1 ? h : `${h} (${n})`
  })
}

type ColDef = { col: number; header: string }

function buildColumns(ws: ExcelJS.Worksheet, headerRowNumber: number): ColDef[] {
  const headerRow = ws.getRow(headerRowNumber)

  // ExcelJS a veces no llena "values" completo; mejor usar columnCount/row.values
  const values = (headerRow.values as CellValue[]) ?? []
  const maxCol = Math.max(ws.columnCount ?? 0, Math.max(0, values.length - 1), headerRow.cellCount ?? 0)

  const cols: ColDef[] = []
  const lookAheadEnd = Math.min(ws.rowCount, headerRowNumber + 5)

  for (let c = 1; c <= Math.max(maxCol, 1); c++) {
    const rawHeader = vToString(headerRow.getCell(c).value).trim()

    if (rawHeader) {
      cols.push({ col: c, header: rawHeader })
      continue
    }

    // Si no hay header, pero sí hay datos debajo, lo incluimos con placeholder
    if (columnHasData(ws, c, headerRowNumber + 1, lookAheadEnd)) {
      cols.push({ col: c, header: `Unnamed column ${c}` })
    }
  }

  // dedupe para que no se pisen keys (muy común en exports)
  const deduped = dedupeHeaders(cols.map((x) => x.header))
  return cols.map((x, i) => ({ ...x, header: deduped[i] }))
}


export async function analyzeExcelFromGcs(
  gcsUri: string,
  schema: any,
  previewLimit = 50
): Promise<AnalyzeResult> {
  try {
    console.log("📊 analyzeExcelFromGcs starting:", { gcsUri, previewLimit })

    const bytes = await downloadGs(gcsUri)
    console.log("✅ File downloaded, size:", bytes.length)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(bytes as any)
    console.log("✅ Workbook loaded, worksheets:", wb.worksheets.length, "views:", wb.views?.length ?? 0)

    const activeTab = (wb.views?.[0] as any)?.activeTab ?? 0
    const ws = wb.worksheets[activeTab] ?? wb.worksheets[0]
    if (!ws) throw new Error("No worksheet found in Excel file")

    console.log("📄 Using worksheet:", { name: ws.name, rowCount: ws.rowCount, columnCount: ws.columnCount })

    // 1) detectar fila de headers
    const headerRowNumber = findHeaderRowNumber(ws, 20)
    console.log("📑 Header row detected:", headerRowNumber)

    // 2) construir columnas preservando índice
    const columns = buildColumns(ws, headerRowNumber)
    const headers = columns.map((c) => c.header)

    console.log("📑 Headers extracted:", headers)

    if (headers.length === 0) throw new Error("No headers detected")

    // 3) preview rows (sin cortar por 1 fila vacía)
    const previewRows: Record<string, unknown>[] = []
    let emptyStreak = 0

    for (let r = headerRowNumber + 1; r <= ws.rowCount && previewRows.length < previewLimit; r++) {
      const row = ws.getRow(r)
      if (!row) continue

      const obj: Record<string, unknown> = {}
      for (const c of columns) {
        obj[c.header] = row.getCell(c.col).value ?? null
      }

      const allEmpty = Object.values(obj).every((v) => isEmptyValue(v))
      if (allEmpty) {
        emptyStreak++
        if (emptyStreak >= 5) break // corta solo si hay varias filas vacías seguidas
        continue
      }

      emptyStreak = 0
      previewRows.push(obj)
    }

    console.log("✅ Preview rows extracted:", previewRows.length)

    // 4) alias mapping (igual que el tuyo)
    const canonicalFields: Record<string, any> = schema?.canonicalFields ?? {}
    const aliasMap: Record<string, string> = {}

    for (const [field, def] of Object.entries<any>(canonicalFields)) {
      const aliases: string[] = Array.isArray(def?.aliases) ? def.aliases : []
      for (const a of [field, ...aliases]) aliasMap[norm(String(a))] = field
    }

    const suggestions: Record<string, string> = {}
    headers.forEach((h) => {
      const match = aliasMap[norm(h)]
      if (match) suggestions[h] = match
    })

    const required = Object.entries<any>(canonicalFields)
      .filter(([, d]) => d?.required)
      .map(([f]) => f)

    const mapped = new Set(Object.values(suggestions))
    const missingRequired = required.filter((r) => !mapped.has(r))

    const extraColumns = headers.filter((h) => !suggestions[h])

    return {
      headers,
      previewRows,
      suggestions,
      missingRequired,
      extraColumns,
    }
  } catch (error: any) {
    console.error("❌ Error in analyzeExcelFromGcs:", error)
    throw error
  }
}