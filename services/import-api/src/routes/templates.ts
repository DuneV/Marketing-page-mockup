// services/import-api/src/routes/template.ts

import { Router } from "express"
import ExcelJS from "exceljs"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { getActiveSchema } from "../lib/schemas.js"

export const templatesRouter = Router()

templatesRouter.get("/", async (req, res) => {
  try {
    await requireAdmin(req)

    const clientId = String(req.query.clientId ?? "")
    const type = String(req.query.type ?? "")

    if (!clientId || !type) {
      return res.status(400).json({ error: "Missing clientId/type" })
    }

    // 👇 SOLO depende del tipo (campaigns, etc.)
    const schemaRow = await getActiveSchema(type)

    const canonicalFields = schemaRow.canonical_fields ?? {}
    const headers = Object.keys(canonicalFields)

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Template")

    ws.addRow(headers)

    const buf = await wb.xlsx.writeBuffer()

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${type}-${clientId}-template.xlsx"`
    )

    res.send(Buffer.from(buf))
  } catch (e: any) {
    res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})
