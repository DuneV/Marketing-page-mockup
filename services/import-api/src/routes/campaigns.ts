// services\import-api\src\routes\campaigns.ts

import { Router } from "express"
import { requireAdmin } from "../middleware/requireAdmin.js"
import { requireAuth } from "../middleware/requireAuth.js"
import { query, queryOne } from "../lib/db.js"
import { uploadJson, downloadJson, deleteJson, bucketName, createSignedUploadUrl, deleteGsUri } from "../lib/gcs.js"
import { admin } from "../lib/firebaseAdmin.js"
import { getActiveSchema } from "../lib/schemas.js"

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

type MeasureType = "count" | "numeric"

interface ChartMetric {
  field: string            // canonical_field numérico
  agg?: KPIAgg             // sum/mean/max...
  axis?: "left" | "right"  // para multi-eje (si lo soportas en el front)
}

interface ChartConfig {
  id: string
  tipo: string
  titulo: string
  columnas: number

  // Compat legacy (tu builder lo sigue mandando)
  fuente?: string

  // Ejes nuevos
  groupBy?: string         // X axis (dimensión)
  labelField?: string      // texto para labels (default = groupBy)
  seriesBy?: string        // split por categoría (stack/legend)

  // Medición Y
  measureType?: MeasureType
  countField?: string | "__rows__"

  // 1 o muchas métricas
  metric?: string          // legacy (1 métrica)
  metric2?: string         // legacy (2 métricas - scatter)
  agg?: KPIAgg             // legacy
  metrics?: ChartMetric[]  // nuevo (N métricas)

  // Opcionales
  barOrientation?: "vertical" | "horizontal"
  barMode?: "grouped" | "stacked"
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
    graficos: ChartConfig[]
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

function getNumber(v: any) {
  if (v === "" || v == null) return NaN
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
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

    // Un import DONE activo por slot (el más reciente de cada uno)
    const activeImports = await query<{ id: string; source_label: string }>(
      `SELECT DISTINCT ON (source_label) id, source_label
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
         AND status = 'DONE'
       ORDER BY source_label, created_at DESC`,
      [campaignId]
    )

    if (activeImports.length === 0) {
      return res.json({ fields: [], filters: [], slots: [], importByLabel: {}, importId: null })
    }

    const importByLabel: Record<string, string> = Object.fromEntries(
      activeImports.map(i => [i.source_label, i.id])
    )
    const primaryImportId = importByLabel["primary"] ?? activeImports[0].id

    // Schema
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

    // Campos por slot
    const allFields: Array<{
      name: string
      type: AvailableFieldType
      sampleCount: number
      sourceLabel: string
    }> = []

    for (const imp of activeImports) {
      const mappings = await query<{ canonical_field: string }>(
        `SELECT DISTINCT canonical_field
         FROM imports.import_mappings
         WHERE import_id = $1
         ORDER BY canonical_field`,
        [imp.id]
      )

      const sampleRows = await query<{ data: any }>(
        `SELECT data FROM staging.staging_rows
         WHERE import_id = $1 AND is_valid = true LIMIT 100`,
        [imp.id]
      )

      for (const m of mappings) {
        const name = m.canonical_field
        const type = normalizeSchemaType(canonicalSchema?.[name]?.type)
        const sampleCount = sampleRows.filter(
          r => r.data?.[name] != null && r.data?.[name] !== ""
        ).length
        allFields.push({ name, type, sampleCount, sourceLabel: imp.source_label })
      }
    }

    // Filtros solo del slot primary (o primero disponible)
    const primaryLabel = importByLabel["primary"] ? "primary" : activeImports[0].source_label
    const filters = allFields
      .filter(f => f.sourceLabel === primaryLabel && FILTERABLE_FIELDS.has(f.name))
      .map(f => ({
        name: f.name,
        type: f.type,
        operators: FILTER_OPS[f.type ?? "unknown"],
      }))

    return res.json({
      fields: allFields,
      filters,
      slots: activeImports.map(i => i.source_label),
      importByLabel,
      importId: primaryImportId,
    })
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
      for (const ch of (fila.graficos ?? [])) {
        const tipo = ch.tipo
        const groupBy = (ch.groupBy ?? ch.labelField ?? ch.fuente ?? "fuente") as string
        const labelField = (ch.labelField ?? groupBy) as string
        const seriesBy = ch.seriesBy
        
        if (!groupBy) {
          charts[ch.id] = []
          continue
        }
        
        const measureType: "count" | "numeric" = (ch.measureType as any) ?? "count"
        const countField = (ch.countField ?? "__rows__") as any

        // Normaliza lista de métricas (N)
        const metrics: ChartMetric[] =
          (Array.isArray(ch.metrics) && ch.metrics.length > 0)
            ? ch.metrics
            : (measureType === "numeric" && (ch.metric || ch.fuente))
              ? [{ field: (ch.metric ?? ch.fuente) as string, agg: (ch.agg ?? "sum") as KPIAgg, axis: "left" }]
              : []

        // -----------------------
        // barras / tabla / torta
        // -----------------------
        if (tipo === "barras" || tipo === "tabla" || tipo === "torta") {
          // grouped[groupKey][seriesKey] => acumuladores
          // Si NO hay seriesBy, usa "__all__"
          const acc: Record<string, Record<string, any>> = {}

          for (const d of data) {
            const g = String(d?.[groupBy] ?? "N/A")
            const s = seriesBy ? String(d?.[seriesBy] ?? "N/A") : "__all__"

            acc[g] ??= {}
            acc[g][s] ??= {
              __count_rows__: 0,
              __count_fields__: {}, // count por campo
              __nums__: {},         // {metricField: number[]}
            }

            // count base
            acc[g][s].__count_rows__++

            // countField
            if (countField && countField !== "__rows__") {
              const v = d?.[countField]
              if (v != null && String(v).trim() !== "") {
                acc[g][s].__count_fields__[countField] = (acc[g][s].__count_fields__[countField] ?? 0) + 1
              }
            }

            // numeric metrics values
            for (const m of metrics) {
              const field = m.field
              acc[g][s].__nums__[field] ??= []
              const n = getNumber(d?.[field])
              if (Number.isFinite(n)) acc[g][s].__nums__[field].push(n)
            }
          }

          // Construye dataset final
          // Caso A) sin seriesBy: [{ name, <metric1>, <metric2>, ... }] o count
          // Caso B) con seriesBy: [{ name, series, <metric1>, ... }] (para stacked/grouped en front)
          const out: any[] = []
          const groups = Object.keys(acc)

          for (const g of groups) {
            const seriesKeys = Object.keys(acc[g])

            for (const s of seriesKeys) {
              const cell = acc[g][s]

              const row: any = {
                name: String((labelField && labelField !== groupBy) ? (data.find(x => String(x?.[groupBy] ?? "N/A") === g)?.[labelField] ?? g) : g),
              }

              if (seriesBy) row.series = s

              if (measureType === "count") {
                const v =
                  countField === "__rows__"
                    ? cell.__count_rows__
                    : (cell.__count_fields__[countField] ?? 0)

                // Para barras/torta/tabla en count, expón "value"
                row.value = v
              } else {
                // numeric: agrega N métricas
                for (const m of metrics) {
                  const xs = cell.__nums__[m.field] ?? []
                  row[m.field] = agg(xs, (m.agg ?? "sum") as KPIAgg)
                  row.__axis__ ??= {}
                  row.__axis__[m.field] = m.axis ?? "left"
                }
              }

              out.push(row)
            }
          }

          // Para torta: normalmente quieres 1 métrica (o value)
          if (tipo === "torta") {
            // si numeric y hay 1 métrica, mapearla a value
            if (measureType === "numeric") {
              const first = metrics[0]?.field
              charts[ch.id] = out
                .map(r => ({ name: r.name, value: Number(r[first] ?? 0) }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 20)
            } else {
              charts[ch.id] = out
                .map(r => ({ name: r.name, value: Number(r.value ?? 0) }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 20)
            }
          } else {
            // barras/tabla: devuelve todo (puedes limitar top-N si quieres)
            charts[ch.id] = out
          }

          continue
        }

        // -----------------------
        // spline / area (time series)
        // -----------------------
        if (tipo === "spline" || tipo === "area") {
          const timeField = groupBy ?? "date" // si groupBy apunta a una fecha, perfecto
          const accT: Record<string, any> = {}

          for (const d of data) {
            const t = String(d?.[timeField] ?? "")
            if (!t) continue

            const s = seriesBy ? String(d?.[seriesBy] ?? "N/A") : "__all__"
            accT[t] ??= {}
            accT[t][s] ??= { __count_rows__: 0, __nums__: {} }

            accT[t][s].__count_rows__++

            for (const m of metrics) {
              accT[t][s].__nums__[m.field] ??= []
              const n = getNumber(d?.[m.field])
              if (Number.isFinite(n)) accT[t][s].__nums__[m.field].push(n)
            }
          }

          const out: any[] = []
          const ts = Object.keys(accT).sort()

          for (const t of ts) {
            for (const s of Object.keys(accT[t])) {
              const cell = accT[t][s]
              const row: any = { date: t }
              if (seriesBy) row.series = s

              if (measureType === "count") {
                row.value = cell.__count_rows__
              } else {
                for (const m of metrics) {
                  row[m.field] = agg(cell.__nums__[m.field] ?? [], (m.agg ?? "sum") as KPIAgg)
                }
              }
              out.push(row)
            }
          }

          charts[ch.id] = out
          continue
        }

        // -----------------------
        // scatter
        // -----------------------
        if (tipo === "scatter") {
          const xField = ch.metric ?? metrics[0]?.field
          const yField = ch.metric2 ?? metrics[1]?.field ?? metrics[0]?.field

          const out = data
            .map(d => ({ x: getNumber(d?.[xField]), y: getNumber(d?.[yField]), name: String(d?.[labelField] ?? "") }))
            .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
            .slice(0, 5000)

          charts[ch.id] = out
          continue
        }

        // default
        charts[ch.id] = []
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
    const auth = await requireAuth(req)
    const { campaignId } = req.params

    if (auth.role !== "admin" && auth.role !== "company") {
      return res.status(403).json({ error: "FORBIDDEN" })
    }

    // Un import DONE activo por slot
    let activeImports: Array<{ id: string; source_label: string }>

    if (auth.role === "company") {
      if (!auth.companyId) return res.status(400).json({ error: "MISSING_COMPANY_ID" })

      activeImports = await query<{ id: string; source_label: string }>(
        `SELECT DISTINCT ON (source_label) id, source_label
         FROM imports.imports
         WHERE campaign_id = $1
           AND company_id = $2
           AND import_type = 'campaigns'
           AND status = 'DONE'
         ORDER BY source_label, created_at DESC`,
        [campaignId, auth.companyId]
      )

      if (activeImports.length === 0) {
        return res.status(403).json({ error: "FORBIDDEN" })
      }
    } else {
      activeImports = await query<{ id: string; source_label: string }>(
        `SELECT DISTINCT ON (source_label) id, source_label
         FROM imports.imports
         WHERE campaign_id = $1
           AND import_type = 'campaigns'
           AND status = 'DONE'
         ORDER BY source_label, created_at DESC`,
        [campaignId]
      )
    }

    if (activeImports.length === 0) {
      return res.json({ rows: [], dataBySlot: {} })
    }

    const dataBySlot: Record<string, any[]> = {}

    for (const imp of activeImports) {
      const rows = await query<{ data: any }>(
        `SELECT data
         FROM staging.staging_rows
         WHERE import_id = $1
           AND is_valid = true
         ORDER BY row_number ASC
         LIMIT 50000`,
        [imp.id]
      )
      dataBySlot[imp.source_label] = rows.map(r => r.data)
    }

    const primaryRows = dataBySlot["primary"] ?? Object.values(dataBySlot)[0] ?? []

    console.log(`Dataset loaded for ${campaignId}: slots=${Object.keys(dataBySlot).join(",")}, totalRows=${Object.values(dataBySlot).flat().length}`)

    return res.json({ rows: primaryRows, dataBySlot })
  } catch (e: any) {
    console.error("dataset error:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

// DELETE /campaigns/:campaignId/imports/slot/:sourceLabel
// Elimina SOLO el slot indicado (no "primary" por seguridad)
campaignsRouter.delete("/:campaignId/imports/slot/:sourceLabel", async (req, res) => {
  try {
    await requireAdmin(req)
    const { campaignId, sourceLabel } = req.params

    if (!sourceLabel || sourceLabel === "primary") {
      return res.status(400).json({
        error: "INVALID_SLOT",
        message: "No se puede eliminar el slot 'primary' desde este endpoint.",
      })
    }

    const imports = await query<{ id: string; gcs_uri: string }>(
      `SELECT id, gcs_uri
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
         AND source_label = $2`,
      [campaignId, sourceLabel]
    )

    if (imports.length === 0) {
      return res.json({ ok: true, deletedImports: 0, deletedStagingRows: 0, deletedMappings: 0 })
    }

    const importIds = imports.map(i => i.id)

    // GCS (best-effort)
    await Promise.all(
      imports.map(i => i.gcs_uri).filter(Boolean).map(async (uri) => {
        try { await deleteGsUri(uri) } catch { /* ignore */ }
      })
    )

    const delStaging = await query<{ count: string }>(
      `WITH d AS (DELETE FROM staging.staging_rows WHERE import_id = ANY($1) RETURNING 1)
       SELECT COUNT(*)::text AS count FROM d`,
      [importIds]
    )

    const delMappings = await query<{ count: string }>(
      `WITH d AS (DELETE FROM imports.import_mappings WHERE import_id = ANY($1) RETURNING 1)
       SELECT COUNT(*)::text AS count FROM d`,
      [importIds]
    )

    const delImports = await query<{ count: string }>(
      `WITH d AS (DELETE FROM imports.imports WHERE id = ANY($1) RETURNING 1)
       SELECT COUNT(*)::text AS count FROM d`,
      [importIds]
    )

    return res.json({
      ok: true,
      sourceLabel,
      deletedImports: Number(delImports[0]?.count ?? 0),
      deletedStagingRows: Number(delStaging[0]?.count ?? 0),
      deletedMappings: Number(delMappings[0]?.count ?? 0),
    })
  } catch (e: any) {
    console.error("delete slot error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
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

// --------------------------------------------------------------------
// NUEVO: GET /campaigns/:campaignId/latest-import
// --------------------------------------------------------------------
campaignsRouter.get("/:campaignId/latest-import", async (req, res) => {
  try {
    const auth = await requireAuth(req)
    const { campaignId } = req.params

    // company: debe existir un import DONE de su empresa
    if (auth.role === "company") {
      if (!auth.companyId) return res.status(400).json({ error: "MISSING_COMPANY_ID" })

      const check = await queryOne(
        `SELECT 1
         FROM imports.imports
         WHERE campaign_id = $1
           AND company_id = $2
         LIMIT 1`,
        [campaignId, auth.companyId]
      )
      if (!check) {
        return res.status(403).json({ error: "FORBIDDEN", message: "No tienes acceso a esta campaña" })
      }
    }

    const row = await queryOne<any>(
      `SELECT id, original_filename, status, source_label, created_at, updated_at
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
       ORDER BY created_at DESC
       LIMIT 1`,
      [campaignId]
    )

    const slotRows = await query<any>(
      `SELECT DISTINCT ON (source_label)
         id, original_filename, status, source_label, created_at, updated_at
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
       ORDER BY source_label, created_at DESC`,
      [campaignId]
    )

    if (!row) return res.json({ exists: false, latest: null, slots: [] })
    return res.json({
      exists: true,
      latest: {
        id: row.id,
        filename: row.original_filename,
        status: row.status,
        sourceLabel: row.source_label ?? "primary",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      slots: slotRows.map((r: any) => ({
        sourceLabel: r.source_label ?? "primary",
        id: r.id,
        filename: r.original_filename,
        status: r.status,
        createdAt: r.created_at,
      })),
    })
  } catch (e: any) {
    console.error("latest-import error:", e)
    return res.status(500).json({ error: e?.message ?? "error" })
  }
})

// --------------------------------------------------------------------
// NUEVO: POST /campaigns/:campaignId/imports/replace
// - Borra imports previos + staging + mappings
// - Borra archivos en GCS (gcs_uri)
// - Crea un nuevo import y devuelve uploadUrl
// --------------------------------------------------------------------
campaignsRouter.post("/:campaignId/imports/replace", async (req, res) => {
  try {
    const user = await requireAdmin(req)
    const { campaignId } = req.params

    const body = req.body as { companyId?: string; filename: string; sourceLabel?: string }
    const filename = body?.filename
    const sourceLabel = body.sourceLabel?.trim() || "primary"
    if (!filename || !filename.toLowerCase().endsWith(".xlsx")) {
      return res.status(400).json({ error: "Only .xlsx allowed and filename is required" })
    }

    // 1) agarrar imports del slot específico de esa campaña
    const existing = await query<{ id: string; gcs_uri: string; company_id: string }>(
      `SELECT id, gcs_uri, company_id
       FROM imports.imports
       WHERE campaign_id = $1
         AND import_type = 'campaigns'
         AND source_label = $2`,
      [campaignId, sourceLabel]
    )

    const existingIds = existing.map(x => x.id)
    const resolvedCompanyId =
      body.companyId ??
      existing[0]?.company_id ?? null

    if (!resolvedCompanyId) {
      return res.status(400).json({
        error: "MISSING_COMPANY_ID",
        message: "No se pudo inferir companyId. Envíalo en el body.",
      })
    }

    // 2) borrar archivos GCS anteriores (best-effort)
    await Promise.all(
      existing
        .map(x => x.gcs_uri)
        .filter(Boolean)
        .map(async (uri) => {
          try { await deleteGsUri(uri) } catch { /* ignore */ }
        })
    )

    // 3) borrar staging_rows + mappings + imports (si existen)
    if (existingIds.length > 0) {
      // staging_rows
      await query(`DELETE FROM staging.staging_rows WHERE import_id = ANY($1)`, [existingIds])
      // mappings
      await query(`DELETE FROM imports.import_mappings WHERE import_id = ANY($1)`, [existingIds])
      // imports
      await query(`DELETE FROM imports.imports WHERE id = ANY($1)`, [existingIds])
    }

    // 4) crear nuevo import igual que importsRouter.post("/")
    const importType = "campaigns"
    const schema = await getActiveSchema(importType)

    const importId = crypto.randomUUID()
    const safeFilename = filename.replace(/[^\w.\-() ]/g, "_")
    const objectPath = `imports/${resolvedCompanyId}/${importType}/${importId}-${safeFilename}`

    const uploadUrl = await createSignedUploadUrl(objectPath)
    const gcsUri = `gs://${process.env.GCS_BUCKET}/${objectPath}`

    await query(
      `INSERT INTO imports.imports
        (id, company_id, campaign_id, import_type, schema_version, uploaded_by, original_filename, gcs_uri, status, source_label, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, 'UPLOADED', $9, now(), now())`,
      [
        importId,
        resolvedCompanyId,
        campaignId,
        importType,
        schema.version,
        user.uid,
        safeFilename,
        gcsUri,
        sourceLabel,
      ]
    )

    return res.json({
      ok: true,
      importId,
      uploadUrl,
      sourceLabel,
      deletedPreviousImports: existingIds.length,
    })
  } catch (e: any) {
    console.error("replace import error:", e)
    return res.status(e?.status ?? 500).json({ error: e?.message ?? "error" })
  }
})