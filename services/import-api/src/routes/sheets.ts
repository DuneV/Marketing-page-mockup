// services/import-api/src/routes/sheets.ts
import { Router } from "express"

export const sheetsRouter = Router()

function parseSpreadsheetIdFromUrl(url: string): string | null {
  // https://docs.google.com/spreadsheets/d/<ID>/...
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return m?.[1] ?? null
}

/**
 * GET /sheets/tabs?url=...   o  /sheets/tabs?spreadsheetId=...
 * Requiere GOOGLE_SHEETS_API_KEY para listar pestañas con la API v4.
 */
sheetsRouter.get("/tabs", async (req, res) => {
  try {
    const spreadsheetIdParam = String(req.query.spreadsheetId ?? "").trim()
    const urlParam = String(req.query.url ?? "").trim()

    const spreadsheetId =
      spreadsheetIdParam ||
      (urlParam ? parseSpreadsheetIdFromUrl(urlParam) : "")

    if (!spreadsheetId) {
      return res.status(400).json({ error: "Missing spreadsheetId or url" })
    }

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GOOGLE_SHEETS_API_KEY" })
    }

    const endpoint =
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
      `?fields=sheets(properties(sheetId,title,index))&key=${encodeURIComponent(apiKey)}`

    const r = await fetch(endpoint, { cache: "no-store" })
    if (!r.ok) {
      const txt = await r.text()
      return res.status(r.status).json({ error: txt || `Google API error: ${r.status}` })
    }

    const data: any = await r.json()

    const tabs =
      (data?.sheets ?? [])
        .map((s: any) => ({
          gid: String(s?.properties?.sheetId ?? ""),
          title: String(s?.properties?.title ?? ""),
          index: Number(s?.properties?.index ?? 0),
        }))
        .filter((t: any) => t.gid && t.title)
        .sort((a: any, b: any) => a.index - b.index)
        .map(({ gid, title }: any) => ({ gid, title }))

    return res.json({ spreadsheetId, tabs })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" })
  }
})

/**
 * GET /sheets/export?spreadsheetId=...&gid=...&filename=...
 * Exporta XLSX desde docs.google.com y lo devuelve como binario.
 *
 * Nota: esto funciona si el Sheet es accesible por enlace.
 * Si es privado, Google suele devolver HTML (login) y acá devolvemos error claro.
 */
sheetsRouter.get("/export", async (req, res) => {
  try {
    const spreadsheetId = String(req.query.spreadsheetId ?? "").trim()
    const gid = String(req.query.gid ?? "").trim()
    const filename = String(req.query.filename ?? "from_sheets.xlsx").trim()

    if (!spreadsheetId) {
      return res.status(400).json({ error: "Missing spreadsheetId" })
    }

    const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=xlsx`
    const exportUrl = gid ? `${base}&gid=${encodeURIComponent(gid)}` : base

    const r = await fetch(exportUrl, { redirect: "follow" })
    const contentType = r.headers.get("content-type") || ""

    if (!r.ok) {
      const txt = await r.text().catch(() => "")
      return res.status(r.status).json({ error: txt || `Export failed: ${r.status}` })
    }

    // Si es privado, normalmente devuelve HTML (pantalla de login / permiso)
    if (contentType.includes("text/html")) {
      const txt = await r.text().catch(() => "")
      return res.status(403).json({
        error:
          "Google devolvió HTML (probablemente el Sheet es privado o requiere login). " +
          "Hazlo accesible por enlace o usa un flujo con OAuth / service account compartida.",
        details: txt.slice(0, 200),
      })
    }

    const ab = await r.arrayBuffer()
    const buf = Buffer.from(ab)

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    return res.status(200).send(buf)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" })
  }
})