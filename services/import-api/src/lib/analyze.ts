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
  return String(v as any)
}

export async function analyzeExcelFromGcs(gcsUri: string, schema: any, previewLimit = 50): Promise<AnalyzeResult> {
  const bytes = await downloadGs(gcsUri)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes as any)

  const ws = wb.worksheets[0]
  if (!ws) throw new Error("No worksheet found")

  const headerRow = ws.getRow(1)
  const values = headerRow.values as CellValue[]
  const headers = values.slice(1).map(v => vToString(v).trim()).filter(Boolean)

  const previewRows: Record<string, unknown>[] = []
  for (let i = 2; i < 2 + previewLimit; i++) {
    const row = ws.getRow(i)
    if (!row || row.cellCount === 0) continue
    const obj: Record<string, unknown> = {}
    headers.forEach((h, idx) => { obj[h] = row.getCell(idx + 1).value ?? null })
    const allNull = Object.values(obj).every(x => x == null || x === "")
    if (allNull) break
    previewRows.push(obj)
  }

  const canonicalFields: Record<string, any> = schema?.canonicalFields ?? {}
  const aliasMap: Record<string, string> = {}

  for (const [field, def] of Object.entries<any>(canonicalFields)) {
    const aliases: string[] = Array.isArray(def?.aliases) ? def.aliases : []
    for (const a of [field, ...aliases]) aliasMap[norm(String(a))] = field
  }

  const suggestions: Record<string, string> = {}
  headers.forEach(h => {
    const match = aliasMap[norm(h)]
    if (match) suggestions[h] = match
  })

  const required = Object.entries<any>(canonicalFields).filter(([,d]) => d?.required).map(([f]) => f)
  const mapped = new Set(Object.values(suggestions))
  const missingRequired = required.filter(r => !mapped.has(r))
  const extraColumns = headers.filter(h => !suggestions[h])

  return { headers, previewRows, suggestions, missingRequired, extraColumns }
}
