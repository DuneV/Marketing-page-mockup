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
  return String(v as any)
}

export async function analyzeExcelFromGcs(gcsUri: string, schema: any, previewLimit = 50): Promise<AnalyzeResult> {
  try {
    console.log("📊 analyzeExcelFromGcs starting:", { gcsUri, previewLimit })
    
    // Descargar archivo
    console.log("📥 Downloading file from GCS...")
    const bytes = await downloadGs(gcsUri)
    console.log("✅ File downloaded, size:", bytes.length)

    // Cargar workbook
    console.log("📋 Loading Excel workbook...")
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(bytes as any)
    console.log("✅ Workbook loaded, worksheets:", wb.worksheets.length)

    const ws = wb.worksheets[0]
    if (!ws) {
      throw new Error("No worksheet found in Excel file")
    }

    console.log("📄 Worksheet found, rows:", ws.rowCount, "columns:", ws.columnCount)

    // Extraer headers
    const headerRow = ws.getRow(1)
    const values = headerRow.values as CellValue[]
    const headers = values.slice(1).map(v => vToString(v).trim()).filter(Boolean)

    console.log("📑 Headers extracted:", headers)

    if (headers.length === 0) {
      throw new Error("No headers found in first row")
    }

    // Extraer preview rows
    console.log("📊 Extracting preview rows...")
    const previewRows: Record<string, unknown>[] = []
    for (let i = 2; i < 2 + previewLimit; i++) {
      const row = ws.getRow(i)
      if (!row || row.cellCount === 0) continue
      
      const obj: Record<string, unknown> = {}
      headers.forEach((h, idx) => { 
        obj[h] = row.getCell(idx + 1).value ?? null 
      })
      
      const allNull = Object.values(obj).every(x => x == null || x === "")
      if (allNull) break
      
      previewRows.push(obj)
    }

    console.log("✅ Preview rows extracted:", previewRows.length)

    // Crear mapeo de aliases
    console.log("🗺️ Creating alias mapping...")
    const canonicalFields: Record<string, any> = schema?.canonicalFields ?? {}
    
    if (Object.keys(canonicalFields).length === 0) {
      console.warn("⚠️ Warning: No canonical fields found in schema")
    }

    const aliasMap: Record<string, string> = {}

    for (const [field, def] of Object.entries<any>(canonicalFields)) {
      const aliases: string[] = Array.isArray(def?.aliases) ? def.aliases : []
      for (const a of [field, ...aliases]) {
        aliasMap[norm(String(a))] = field
      }
    }

    console.log("🗺️ Alias map created with", Object.keys(aliasMap).length, "entries")

    // Crear suggestions
    const suggestions: Record<string, string> = {}
    headers.forEach(h => {
      const match = aliasMap[norm(h)]
      if (match) {
        suggestions[h] = match
        console.log(`  ✓ Matched "${h}" -> "${match}"`)
      } else {
        console.log(`  ✗ No match for "${h}"`)
      }
    })

    console.log("✅ Suggestions created:", Object.keys(suggestions).length, "matches")

    // Identificar campos requeridos faltantes
    const required = Object.entries<any>(canonicalFields)
      .filter(([, d]) => d?.required)
      .map(([f]) => f)

    const mapped = new Set(Object.values(suggestions))
    const missingRequired = required.filter(r => !mapped.has(r))

    if (missingRequired.length > 0) {
      console.warn("⚠️ Missing required fields:", missingRequired)
    }

    // Identificar columnas extra
    const extraColumns = headers.filter(h => !suggestions[h])

    if (extraColumns.length > 0) {
      console.log("ℹ️ Extra columns (not mapped):", extraColumns)
    }

    const result = {
      headers,
      previewRows,
      suggestions,
      missingRequired,
      extraColumns,
    }

    console.log("✅ Analysis completed successfully")

    return result
  } catch (error: any) {
    console.error("❌ Error in analyzeExcelFromGcs:", error)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    throw error
  }
}