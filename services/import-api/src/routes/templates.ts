// services/import-api/src/routes/template.ts

import { Router } from "express"
import ExcelJS from "exceljs"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { getActiveSchema } from "../lib/schemas.js"

export const templatesRouter = Router()

templatesRouter.get("/", async (req, res) => {
  try {
    await requireAdmin(req)

    // Cambiar clientId a companyId para coincidir con el frontend
    const companyId = String(req.query.companyId ?? "")
    const type = String(req.query.type ?? "")

    console.log("📥 Template request:", { companyId, type })

    if (!companyId || !type) {
      return res.status(400).json({ error: "Missing companyId or type" })
    }

    // Obtener el esquema activo
    const schemaRow = await getActiveSchema(type)

    console.log("📋 Schema retrieved:", {
      importType: schemaRow.importType,
      version: schemaRow.version,
      fieldsCount: Object.keys(schemaRow.canonical_fields ?? {}).length
    })

    const canonicalFields = schemaRow.canonical_fields ?? {}
    
    // Extraer solo las claves (nombres de campos canónicos)
    const headers = Object.keys(canonicalFields)

    if (headers.length === 0) {
      return res.status(400).json({ error: "No fields defined in schema" })
    }

    console.log("Template headers:", headers)

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Data")

    const headerRow = ws.addRow(headers)
    
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    headerRow.alignment = { vertical: "middle", horizontal: "center" }

    const exampleRow: string[] = headers.map((header) => {
      const fieldMeta = canonicalFields[header]
      const firstAlias = fieldMeta?.aliases?.[0]
      return firstAlias || header
    })
    ws.addRow(exampleRow)


    headers.forEach((h, i) => {
      ws.getColumn(i + 1).width = Math.max(h.length + 4, 20)
    })

    headers.forEach((header, index) => {
    const fieldMeta = canonicalFields[header]
    if (fieldMeta?.required) {
      const cell = headerRow.getCell(index + 1) // 1-based
      cell.note = "Campo requerido"
    }
  })

    const buf = await wb.xlsx.writeBuffer()

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${type}_${companyId}_template.xlsx"`
    )

    console.log("Template created successfully")

    res.send(Buffer.from(buf))
  } catch (e: any) {
    console.error("Error creating template:", e)
    res.status(e?.status ?? 500).json({ 
      error: e?.message ?? "error",
      details: e?.toString()
    })
  }
})