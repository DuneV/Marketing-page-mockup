// services\import-api\src\routes\campaigns.ts

import { Router } from "express"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { requireAuth } from "../middleware/requireAuth.js"
import { query, queryOne } from "../lib/db.js"
import { uploadJson, downloadJson, deleteJson, bucketName } from "../lib/gcs.js"
import { admin } from "../lib/firebaseAdmin.js"

export const campaignsRouter = Router()

type AvailableFieldType = "number" | "text" | "date" | "boolean" | "unknown"

type Operator =
  | "eq" | "ne"
  | "gt" | "gte" | "lt" | "lte"
  | "contains" | "startsWith" | "endsWith"
  | "in" | "between"
  | "before" | "after"

type KPIAgg = "sum" | "mean" | "count" | "max" | "min" | "median" | "std" | "variance"

interface FilterCondition {
  campo: string
  operador: Operator
  valor: any
}

function reportConfigObjectPath(campaignId: string) {
  return `report-configs/campaigns/${campaignId}.json`
}

interface ReportConfig {
  campaignId: string
  filtros?: {
    aplicar?: boolean
    campanas?: string[]
    fechas?: { inicio: string; fin: string }
    condiciones?: FilterCondition[]
  }
  kpis?: Array<{ id: string; nombre: string; operacion: KPIAgg; fuente: string }>
  filas?: Array<{
    id: string
    orden: number
    graficos: Array<{ id: string; tipo: string; titulo: string; fuente: string; columnas: number }>
  }>
}

/**
 * Mapea los tipos del canonical_fields (SQL) a los tipos que el frontend espera.
 * canonical_fields suele tener: string | number | date | boolean | image
 * Frontend espera: text | number | date | boolean | unknown
 */
function normalizeSchemaType(t: any): AvailableFieldType {
  if (!t) return "unknown"

  if (t === "number") return "number"
  if (t === "boolean") return "boolean"
  if (t === "date") return "date"

  // tu esquema usa string/image, el frontend entiende text
  if (t === "string") return "text"
  if (t === "text") return "text"
  if (t === "image") return "text"

  return "unknown"
}

// Operadores por tipo (para filtros)
const FILTER_OPS: Record<AvailableFieldType, string[]> = {
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "between", "in"],
  date: ["eq", "before", "after", "between"],
  text: ["eq", "contains", "startsWith", "endsWith", "in"],
  boolean: ["eq"],
  unknown: ["eq"],
}

// Campos que quieres permitir como filtros (ajusta a tus canonical_fields reales)
const FILTERABLE_FIELDS = new Set<string>([
  "city",
  "date",
  "establishment_code",
  "point_of_sale_name",
  "promoter_or_seller_name",
  "actividad"
])

/**
 * GET /campaigns/:campaignId/available-fields
 * - Busca el último import DONE de esa campaña (import_type='campaigns')
 * - Obtiene los canonical_field desde import_mappings
 * - Obtiene tipos desde import_schemas.canonical_fields
 * - Calcula sampleCount con staging_rows (opcional pero útil)
 * - Devuelve fields + (opcional) filters + importId
 */
campaignsRouter.get("/:campaignId/available-fields", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params

    console.log("Getting available fields for campaign:", campaignId)

    // 1) Último import DONE de esa campaña
    const lastImport = await queryOne<any>(
      `SELECT id, status, summary
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
         AND status = 'DONE'
       ORDER BY created_at DESC
       LIMIT 1`,
      [campaignId]
    )

    if (!lastImport) {
      return res.json({ fields: [], filters: [], importId: null })
    }

    console.log("Last import found:", lastImport.id)

    // 2) Campos canónicos mapeados en ese import
    const mappings = await query<{ canonical_field: string }>(
      `SELECT DISTINCT canonical_field
       FROM imports.import_mappings
       WHERE import_id = $1
       ORDER BY canonical_field`,
      [lastImport.id]
    )

    if (mappings.length === 0) {
      return res.json({ fields: [], filters: [], importId: lastImport.id })
    }

    console.log("Canonical fields found:", mappings.map(m => m.canonical_field))

    // 3) Traer el schema (canonical_fields) para conocer tipos declarados en SQL
    //    IMPORTANTE: ajusta version si no es 1
    const schemaRow = await queryOne<{ canonical_fields: any }>(
      `SELECT canonical_fields
       FROM imports.import_schemas
       WHERE import_type = 'campaigns'
         AND version = 1
       LIMIT 1`
    )

    let canonicalSchema: Record<string, { type?: string }> = {}
    const raw = schemaRow?.canonical_fields

    if (typeof raw === "string") canonicalSchema = JSON.parse(raw)
    else canonicalSchema = raw ?? {}

    // 4) Muestra de datos staging (para sampleCount)
    const sampleRows = await query<{ data: any }>(
      `SELECT data
       FROM staging.staging_rows
       WHERE import_id = $1
         AND is_valid = true
       LIMIT 100`,
      [lastImport.id]
    )

    console.log("Sample rows retrieved:", sampleRows.length)

    // 5) Tipos desde schema (no inferidos)
    const fieldTypes: Record<string, AvailableFieldType> = {}
    for (const m of mappings) {
      const fieldName = m.canonical_field
      const schemaType = canonicalSchema?.[fieldName]?.type
      fieldTypes[fieldName] = normalizeSchemaType(schemaType)
    }

    console.log("Field types from schema:", fieldTypes)

    // 6) Construir fields (con sampleCount)
    const fields = mappings.map(m => {
      const name = m.canonical_field
      const sampleCount = sampleRows.filter(
        r => r.data?.[name] != null && r.data?.[name] !== ""
      ).length

      return {
        name,
        type: fieldTypes[name] ?? "unknown",
        sampleCount,
      }
    })

    // 7) Construir filtros disponibles
    const filters = mappings
      .map(m => m.canonical_field)
      .filter(name => FILTERABLE_FIELDS.has(name))
      .map(name => ({
        name,
        type: fieldTypes[name] ?? "unknown",
        operators: FILTER_OPS[fieldTypes[name] ?? "unknown"],
      }))

    return res.json({ fields, filters, importId: lastImport.id })
  } catch (e: any) {
    console.error("Error getting available fields:", e)
    return res.status(500).json({
      error: e?.message ?? "error",
      details: e?.toString?.() ?? String(e),
    })
  }
})
// services/import-api/src/routes/campaigns.ts
// Agregar DESPUÉS del endpoint available-fields

// ========================================
// GET /campaigns/:campaignId/filter-options
// ACTUALIZADO: Permite acceso a usuarios company
// ========================================
campaignsRouter.get("/:campaignId/filter-options", async (req, res) => {
  try {
    const auth = await requireAuth(req) // ✅ Cambiado de requireAdmin a requireAuth
    const { campaignId } = req.params
    const fieldsParam = req.query.fields as string | undefined

    if (!fieldsParam) {
      return res.status(400).json({ error: "Missing 'fields' query parameter" })
    }

    const requestedFields = fieldsParam.split(",").map(f => f.trim()).filter(Boolean)

    console.log("Getting filter options for campaign:", campaignId, "fields:", requestedFields)

    // 1) Último import DONE
    let lastImport

    if (auth.role === "company") {
      if (!auth.companyId) {
        return res.status(400).json({ error: "MISSING_COMPANY_ID" })
      }

      // Para company: verificar que el import sea de su empresa
      lastImport = await queryOne<any>(
        `SELECT id
         FROM imports.imports
         WHERE campaign_id = $1
           AND company_id = $2
           AND import_type = 'campaigns'
           AND status = 'DONE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [campaignId, auth.companyId]
      )

      if (!lastImport) {
        return res.status(403).json({ 
          error: "FORBIDDEN",
          message: "No tienes acceso a esta campaña"
        })
      }
    } else {
      // Para admin: cualquier import DONE
      lastImport = await queryOne<any>(
        `SELECT id
         FROM imports.imports
         WHERE campaign_id = $1
           AND import_type = 'campaigns'
           AND status = 'DONE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [campaignId]
      )
    }

    if (!lastImport) {
      return res.json({ options: {}, importId: null })
    }

    // 2) Para cada campo solicitado, extraer valores únicos
    const options: Record<string, Array<{ value: string; label: string }>> = {}

    for (const fieldName of requestedFields) {
      // Validar que el campo esté en FILTERABLE_FIELDS
      if (!FILTERABLE_FIELDS.has(fieldName)) {
        console.warn(`Field ${fieldName} is not filterable, skipping`)
        continue
      }

      try {
        // Query para valores únicos (limitado a 1000 para performance)
        const jsonPath = `data->>'${fieldName}'`
        
        const uniqueValues = await query<{ val: string }>(
          `SELECT DISTINCT ${jsonPath} AS val
           FROM staging.staging_rows
           WHERE import_id = $1
             AND is_valid = true
             AND ${jsonPath} IS NOT NULL
             AND ${jsonPath} != ''
           ORDER BY val
           LIMIT 1000`,
          [lastImport.id]
        )

        options[fieldName] = uniqueValues
          .filter(row => row.val != null)
          .map(row => ({
            value: row.val,
            label: row.val,
          }))

        console.log(`✓ Field ${fieldName}: ${options[fieldName].length} unique values`)
      } catch (fieldError: any) {
        console.error(`✗ Error loading options for field ${fieldName}:`, fieldError.message)
        // Continuar con los demás campos aunque uno falle
        options[fieldName] = []
      }
    }

    return res.json({ options, importId: lastImport.id })
  } catch (e: any) {
    console.error("Error getting filter options:", e)
    return res.status(500).json({
      error: e?.message ?? "error",
      details: e?.toString?.() ?? String(e),
    })
  }
})

//* Creación de dashboard *//

function buildConditionSQL(cond: FilterCondition, idxStart: number) {
  const col = cond.campo
  const op = cond.operador
  const val = cond.valor
  const v = cond?.valor
  
  // ✅ Validación más estricta de valores vacíos
  const isEmpty =
    v === null ||
    v === undefined ||
    v === "" ||
    (typeof v === "string" && v.trim() === "") ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && (
      (v.inicio == null || String(v.inicio).trim() === "") &&
      (v.fin == null || String(v.fin).trim() === "")
    ))

  if (isEmpty) {
    console.log(`⚠️ Valor vacío para campo '${col}', ignorando filtro`)
    return { sql: "TRUE", params: [] }
  }
  
  console.log(`✅ Construyendo filtro para '${col}' con operador '${op}' y valor:`, val)
  
  // Detectar si el campo es una fecha
  const isDateField = col === "date" || col.toLowerCase().includes("fecha") || col.toLowerCase().includes("_date")
  
  // Para campos de fecha, usar NULLIF y cast a date
  const txtDate = `NULLIF(data->>'${col}', '')::date`
  
  // Para campos de texto, usar TRIM y UPPER
  const txt = `TRIM(data->>'${col}')`
  const txtUpper = `UPPER(TRIM(data->>'${col}'))`

  // ✅ OPERADOR EQ - con manejo especial para fechas
  if (op === "eq") {
    if (isDateField) {
      // Para fechas, comparar como date
      return { 
        sql: `${txtDate} = $${idxStart}::date`, 
        params: [String(val ?? "").trim()] 
      }
    } else {
      // Para texto, comparación case-insensitive
      return { 
        sql: `${txtUpper} = UPPER($${idxStart})`, 
        params: [String(val ?? "").trim()] 
      }
    }
  }
  
  // ✅ OPERADOR NE
  if (op === "ne") {
    if (isDateField) {
      return { 
        sql: `${txtDate} <> $${idxStart}::date`, 
        params: [String(val ?? "").trim()] 
      }
    } else {
      return { 
        sql: `${txtUpper} <> UPPER($${idxStart})`, 
        params: [String(val ?? "").trim()] 
      }
    }
  }

  // Text search operators (solo para campos de texto)
  if (op === "contains") {
    return { 
      sql: `${txt} ILIKE $${idxStart}`, 
      params: [`%${String(val ?? "").trim()}%`] 
    }
  }
  
  if (op === "startsWith") {
    return { 
      sql: `${txt} ILIKE $${idxStart}`, 
      params: [`${String(val ?? "").trim()}%`] 
    }
  }
  
  if (op === "endsWith") {
    return { 
      sql: `${txt} ILIKE $${idxStart}`, 
      params: [`%${String(val ?? "").trim()}`] 
    }
  }

  // ✅ OPERADOR IN
  if (op === "in") {
    const arr = Array.isArray(val) ? val.map(v => String(v).trim()) : []
    if (isDateField) {
      // Para fechas
      return { 
        sql: `${txtDate} = ANY($${idxStart}::date[])`, 
        params: [arr] 
      }
    } else {
      // Para texto con case-insensitive
      return { 
        sql: `${txtUpper} = ANY($${idxStart}::text[])`, 
        params: [arr.map(a => a.toUpperCase())] 
      }
    }
  }

  // Operadores numéricos
  if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
    const cmp = op === "gt" ? ">" : op === "gte" ? ">=" : op === "lt" ? "<" : "<="
    return { 
      sql: `NULLIF(${txt}, '')::numeric ${cmp} $${idxStart}`, 
      params: [Number(val)] 
    }
  }

  // ✅ OPERADORES DE FECHA
  if (op === "before") {
    return { 
      sql: `${txtDate} < $${idxStart}::date`, 
      params: [String(val)] 
    }
  }
  
  if (op === "after") {
    return { 
      sql: `${txtDate} > $${idxStart}::date`, 
      params: [String(val)] 
    }
  }

  if (op === "between") {
    let inicio: string | null = null
    let fin: string | null = null

    if (val && typeof val === "object") {
      inicio = val.inicio ?? null
      fin = val.fin ?? null
    } else if (typeof val === "string" && val.includes("|")) {
      const [a, b] = val.split("|")
      inicio = a
      fin = b
    }

    const p1 = idxStart
    const p2 = idxStart + 1
    return {
      sql: `${txtDate} BETWEEN $${p1}::date AND $${p2}::date`,
      params: [String(inicio ?? ""), String(fin ?? "")],
    }
  }

  // fallback
  return { sql: "TRUE", params: [] }
}


function agg(values: number[], op: KPIAgg) {
  const xs = values.filter(v => Number.isFinite(v))
  if (op === "count") return xs.length
  if (xs.length === 0) return 0

  const sum = xs.reduce((a, b) => a + b, 0)
  if (op === "sum") return sum
  if (op === "mean") return sum / xs.length
  if (op === "max") return Math.max(...xs)
  if (op === "min") return Math.min(...xs)

  // median
  if (op === "median") {
    const s = [...xs].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }

  // variance/std
  if (op === "variance" || op === "std") {
    const mean = sum / xs.length
    const variance = xs.reduce((acc, v) => acc + (v - mean) ** 2, 0) / xs.length
    return op === "variance" ? variance : Math.sqrt(variance)
  }

  return 0
}

// ========================================
// POST /campaigns/:campaignId/run-report
// ✅ ACTUALIZADO: Permite acceso a usuarios company
// ========================================
campaignsRouter.post("/:campaignId/run-report", async (req, res) => {
  try {
    const auth = await requireAuth(req) // ✅ Cambiado de requireAdmin a requireAuth
    const { campaignId } = req.params
    const config = req.body as ReportConfig

    // 1) buscar último import DONE
    let lastImport

    if (auth.role === "company") {
      if (!auth.companyId) {
        return res.status(400).json({ error: "MISSING_COMPANY_ID" })
      }

      // Para company: verificar que el import sea de su empresa
      lastImport = await queryOne<any>(
        `SELECT id
         FROM imports.imports
         WHERE campaign_id = $1
           AND company_id = $2
           AND import_type = 'campaigns'
           AND status = 'DONE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [campaignId, auth.companyId]
      )

      if (!lastImport) {
        return res.status(403).json({ 
          error: "FORBIDDEN",
          message: "No tienes acceso a esta campaña o no tiene datos"
        })
      }
    } else {
      // Para admin: cualquier import DONE
      lastImport = await queryOne<any>(
        `SELECT id
         FROM imports.imports
         WHERE campaign_id = $1
           AND import_type = 'campaigns'
           AND status = 'DONE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [campaignId]
      )
    }

    if (!lastImport) {
      return res.json({ importId: null, rows: [], kpis: {}, charts: {}, rowCount: 0 })
    }

    console.log("📊 === DEBUG RUN-REPORT ===")
    console.log("Import ID:", lastImport.id)
    console.log("User role:", auth.role)
    console.log("Config recibido:", JSON.stringify(config, null, 2))

    // 2) armar WHERE base
    const where: string[] = ["import_id = $1", "is_valid = true"]
    const params: any[] = [lastImport.id]
    let p = 2

    const aplicarFiltros = config?.filtros?.aplicar === true
    console.log("Aplicar filtros:", aplicarFiltros)

    // Declarar condiciones fuera del if para usarlas después
    const condiciones = (config?.filtros?.condiciones ?? [])

    if (aplicarFiltros) {
      console.log("Condiciones recibidas:", condiciones.length)

      for (const c of condiciones) {
        console.log("\nProcesando condición:", JSON.stringify(c, null, 2))

        if (!c?.campo || !c?.operador) {
          console.log("Condición inválida (falta campo u operador)")
          continue
        }

        if (!FILTERABLE_FIELDS.has(c.campo)) {
          console.log(`Campo '${c.campo}' NO está en FILTERABLE_FIELDS`)
          console.log("FILTERABLE_FIELDS:", Array.from(FILTERABLE_FIELDS))
          continue
        }

        const built = buildConditionSQL(c, p)

        console.log("SQL generado:", built.sql)
        console.log("Params:", JSON.stringify(built.params))

        where.push(built.sql)
        params.push(...built.params)
        p += built.params.length
      }
    }
    
    const sql = `
      SELECT data
      FROM staging.staging_rows
      WHERE ${where.join(" AND ")}
      LIMIT 50000
    `
    
    console.log("\n📝 === SQL FINAL ===")
    console.log(sql)
    console.log("\n📝 === PARAMS ===")
    console.log(JSON.stringify(params, null, 2))
    console.log("===================\n")
    
    const rows = await query<{ data: any }>(sql, params)
    
    console.log(`✅ Filas encontradas: ${rows.length}`)
    
    // 🔍 Si no hay filas, intentar query de diagnóstico
    if (rows.length === 0 && aplicarFiltros) {
      console.log("\n🔍 === DIAGNÓSTICO: No se encontraron filas ===")
      
      // Query sin filtros para ver cuántas hay en total
      const totalRows = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM staging.staging_rows
         WHERE import_id = $1 AND is_valid = true`,
        [lastImport.id]
      )
      console.log("Total de filas válidas en import:", totalRows[0]?.count)
      
      // Ver valores únicos del campo filtrado
      if (condiciones.length > 0) {
        const campo = condiciones[0].campo
        const uniqueValues = await query<{ value: string; count: string }>(
          `SELECT 
             UPPER(TRIM(data->>'${campo}')) as value,
             COUNT(*) as count
           FROM staging.staging_rows
           WHERE import_id = $1 AND is_valid = true
           GROUP BY UPPER(TRIM(data->>'${campo}'))
           ORDER BY count DESC
           LIMIT 10`,
          [lastImport.id]
        )
        console.log(`Top 10 valores para '${campo}':`, uniqueValues)
      }
      console.log("==========================================\n")
    }
    
    const data = rows.map(r => r.data)

    // Continúa en la parte 2...
    const kpiOut: Record<string, { id: string; nombre: string; value: number }> = {}

    for (const k of (config.kpis ?? [])) {
      if (k.operacion === "count") {
        const cf = (k as any).countField ?? "__rows__"

        const value =
          cf === "__rows__"
            ? data.length
            : data.filter(d => {
                const v = d?.[cf]
                return v != null && String(v).trim() !== ""
              }).length

        kpiOut[k.id] = { id: k.id, nombre: k.nombre, value }
        continue
      }

      const vals = data
        .map(d => d?.[k.fuente])
        .map((v: any) => (v === "" || v == null ? NaN : Number(v)))

      const value = agg(vals, k.operacion)
      kpiOut[k.id] = { id: k.id, nombre: k.nombre, value }
    }

    // 4) datasets por gráfico
    const charts: Record<string, any> = {}

    for (const fila of (config.filas ?? [])) {
      for (const ch of fila.graficos) {
        if (ch.tipo === "barras" || ch.tipo === "torta") {
          const grouped: Record<string, number> = {}
          for (const d of data) {
            const key = String(d?.[ch.fuente] ?? "N/A")
            grouped[key] = (grouped[key] ?? 0) + 1
          }
          charts[ch.id] = Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 20)
        } else if (ch.tipo === "spline" || ch.tipo === "area") {
          const grouped: Record<string, number> = {}
          for (const d of data) {
            const dt = String(d?.date ?? "")
            if (!dt) continue
            const val = Number(d?.[ch.fuente] ?? 0)
            grouped[dt] = (grouped[dt] ?? 0) + (Number.isFinite(val) ? val : 0)
          }
          charts[ch.id] = Object.entries(grouped)
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => (a.date < b.date ? -1 : 1))
        } else {
          charts[ch.id] = []
        }
      }
    }

    console.log("📊 Respuesta final - rowCount:", data.length)

    return res.json({
      importId: lastImport.id,
      kpis: kpiOut,
      charts,
      rowCount: data.length,
    })
  } catch (e: any) {
    console.error("❌ run-report error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})

// ========================================
// GET /campaigns/:campaignId/report-config
// ACTUALIZADO
// ========================================
campaignsRouter.get("/:campaignId/report-config", async (req, res) => {
  try {
    const auth = await requireAuth(req) // ✅ Cambiado de requireAdmin a requireAuth
    const { campaignId } = req.params

    // Si es company, verificar que la campaña pertenezca a su empresa
    if (auth.role === "company") {
      if (!auth.companyId) {
        return res.status(400).json({ error: "MISSING_COMPANY_ID" })
      }

      // Verificar que existe al menos un import de esta campaña para esta empresa
      const importCheck = await queryOne<{ campaign_id: string }>(
        `SELECT campaign_id
         FROM imports.imports
         WHERE campaign_id = $1
           AND company_id = $2
           AND status = 'DONE'
         LIMIT 1`,
        [campaignId, auth.companyId]
      )

      if (!importCheck) {
        return res.status(403).json({ 
          error: "FORBIDDEN",
          message: "No tienes acceso a esta campaña"
        })
      }
    }

    const objectPath = reportConfigObjectPath(campaignId)
    const gsUri = `gs://${bucketName}/${objectPath}`

    // Si no existe, responde vacío/404 suave
    try {
      const config = await downloadJson(gsUri)
      return res.json({ exists: true, gsUri, config })
    } catch (e: any) {
      // Si el archivo no existe, GCS suele botar error. Lo tratamos como "no config"
      return res.json({ exists: false, gsUri, config: null })
    }
  } catch (e: any) {
    console.error("Error getting report-config:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

campaignsRouter.put("/:campaignId/report-config", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params
    const config = req.body

    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "INVALID_CONFIG_BODY" })
    }

    // opcional: fuerza campaignId en el JSON para evitar inconsistencias
    config.campaignId = campaignId

    const objectPath = reportConfigObjectPath(campaignId)
    const gsUri = await uploadJson(objectPath, config)

    return res.json({ ok: true, gsUri })
  } catch (e: any) {
    console.error("Error saving report-config:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

campaignsRouter.delete("/:campaignId/report-config", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params

    const objectPath = reportConfigObjectPath(campaignId)
    const gsUri = `gs://${bucketName}/${objectPath}`

    await deleteJson(objectPath) // safe: ignoreNotFound

    return res.json({ ok: true, gsUri, deleted: true })
  } catch (e: any) {
    console.error("Error deleting report-config:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})


campaignsRouter.get("/:campaignId/dataset", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params


    // 1) último import DONE para esa campaña (igual que available-fields / run-report)
    const lastImport = await queryOne<{ id: string }>(
      `SELECT id
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
         AND status = 'DONE'
       ORDER BY created_at DESC
       LIMIT 1`,
      [campaignId]
    )
    if (!lastImport) {
      return res.json({ rows: [] })
    }
    // 2) data real desde staging
    const rows = await query<{ data: any }>(
      `SELECT data
       FROM staging.staging_rows
       WHERE import_id = $1
         AND is_valid = true
       ORDER BY row_number ASC
       LIMIT 5000`,
      [lastImport.id]
    )
    return res.json({ rows: rows.map(r => r.data) })
  } catch (e: any) {
    console.error("dataset error:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

campaignsRouter.delete("/:campaignId/imports", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId } = req.params

    // OJO: asegúrate del valor real de import_type
    // En tu código usas importType del body; en available-fields filtras import_type='campaigns'
    const imports = await query<{ id: string }>(
      `SELECT id
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'`,
      [campaignId]
    )

    const importIds = imports.map(i => i.id)

    if (importIds.length === 0) {
      return res.json({ ok: true, deletedImports: 0, deletedStagingRows: 0, deletedMappings: 0 })
    }

    // 1) staging_rows
    const delStaging = await query<{ count: string }>(
      `WITH d AS (
         DELETE FROM staging.staging_rows
         WHERE import_id = ANY($1)
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM d`,
      [importIds]
    )

    // 2) mappings
    const delMappings = await query<{ count: string }>(
      `WITH d AS (
         DELETE FROM imports.import_mappings
         WHERE import_id = ANY($1)
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM d`,
      [importIds]
    )

    // 3) imports
    const delImports = await query<{ count: string }>(
      `WITH d AS (
         DELETE FROM imports.imports
         WHERE id = ANY($1)
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM d`,
      [importIds]
    )

    return res.json({
      ok: true,
      deletedImports: Number(delImports[0]?.count ?? 0),
      deletedStagingRows: Number(delStaging[0]?.count ?? 0),
      deletedMappings: Number(delMappings[0]?.count ?? 0),
    })
  } catch (e: any) {
    console.error("❌ delete imports/staging error:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

campaignsRouter.get("/with-report-config", async (req, res) => {
  try {
    await requireAdmin(req)

    // campañas que al menos tienen un import DONE (para que run-report funcione)
    const rows = await query<{ campaign_id: string }>(
      `
      SELECT DISTINCT campaign_id
      FROM imports.imports
      WHERE import_type = 'campaigns'
        AND status = 'DONE'
        AND campaign_id IS NOT NULL
      ORDER BY campaign_id
      `
    )

    const campaignIds = rows.map(r => r.campaign_id).filter(Boolean)

    // ahora filtramos las que tienen JSON en GCS
    // (usamos downloadJson como "exists check"; si falla, no existe)
    const out: Array<{ campaignId: string; gsUri: string }> = []

    for (const campaignId of campaignIds) {
      const objectPath = reportConfigObjectPath(campaignId)
      const gsUri = `gs://${bucketName}/${objectPath}`

      try {
        await downloadJson(gsUri) // si existe, ok
        out.push({ campaignId, gsUri })
      } catch {
        // no existe config, ignorar
      }
    }

    return res.json({ campaignIds: out.map(x => x.campaignId), items: out })
  } catch (e: any) {
    console.error("❌ with-report-config error:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

// GET /campaigns/mine
// - admin: devuelve todas las campañas con imports DONE
// - company: devuelve solo las de su companyId
campaignsRouter.get("/mine", async (req, res) => {
  try {
    const auth = await requireAuth(req)

    if (auth.role === "company" && !auth.companyId) {
      return res.status(400).json({ error: "MISSING_COMPANY_ID" })
    }

    const rows = auth.role === "admin"
      ? await query<{ campaign_id: string }>(
          `
          SELECT DISTINCT campaign_id
          FROM imports.imports
          WHERE status = 'DONE'
            AND campaign_id IS NOT NULL
          ORDER BY campaign_id
          `
        )
      : await query<{ campaign_id: string }>(
          `
          SELECT DISTINCT campaign_id
          FROM imports.imports
          WHERE company_id = $1
            AND status = 'DONE'
            AND campaign_id IS NOT NULL
          ORDER BY campaign_id
          `,
          [auth.companyId]
        )

    return res.json({ campaignIds: rows.map(r => r.campaign_id) })
  } catch (e: any) {
    console.error("GET /campaigns/mine error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})


async function hasReportConfig(campaignId: string) {
  const objectPath = reportConfigObjectPath(campaignId)
  const gsUri = `gs://${bucketName}/${objectPath}`
  try {
    await downloadJson(gsUri)
    return true
  } catch {
    return false
  }
}

// GET /campaigns/mine-with-dashboard
campaignsRouter.get("/mine-with-dashboard", async (req, res) => {
  try {
    const auth = await requireAuth(req)

    if (auth.role === "company" && !auth.companyId) {
      return res.status(400).json({ error: "MISSING_COMPANY_ID" })
    }

    // 1) campañas "permitidas" por empresa (SQL)
    const sqlRows =
      auth.role === "admin"
        ? await query<{ campaign_id: string }>(
            `
            SELECT DISTINCT campaign_id
            FROM imports.imports
            WHERE status = 'DONE'
              AND campaign_id IS NOT NULL
            `
          )
        : await query<{ campaign_id: string }>(
            `
            SELECT DISTINCT campaign_id
            FROM imports.imports
            WHERE company_id = $1
              AND status = 'DONE'
              AND campaign_id IS NOT NULL
            `,
            [auth.companyId]
          )

    const ids = sqlRows.map(r => r.campaign_id).filter(Boolean)

    // 2) filtrar a los que SÍ tienen report-config en GCS
    const checks = await Promise.all(
      ids.map(async (id) => ({ id, ok: await hasReportConfig(id) }))
    )

    const campaignIds = checks.filter(x => x.ok).map(x => x.id)

    // 3) NUEVO: obtener datos de Firestore para estas campañas
    const campaigns: Array<{ id: string; [key: string]: any }> = []
    
    if (campaignIds.length > 0) {
      // Firestore tiene límite de 10 items en 'in' queries, dividimos en chunks
      const chunks = []
      for (let i = 0; i < campaignIds.length; i += 10) {
        chunks.push(campaignIds.slice(i, i + 10))
      }

      for (const chunk of chunks) {
        const snapshot = await admin
          .firestore()
          .collection("campaigns")
          .where(admin.firestore.FieldPath.documentId(), "in", chunk)
          .get()

        snapshot.docs.forEach(doc => {
          campaigns.push({
            id: doc.id,
            ...doc.data()
          })
        })
      }
    }

    return res.json({ 
      campaignIds,
      campaigns // Ahora incluimos los datos completos
    })
  } catch (e: any) {
    console.error("GET /campaigns/mine-with-dashboard error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})