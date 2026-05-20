"use client"

import React, { useMemo, useState, useEffect } from "react"
import type {
  ReportConfiguration,
  KPIDefinition,
  ChartDefinition,
  DashboardRow,
  KPIOperation,
  ChartMetricDefinition,
} from "@/types/report-config"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  FunnelChart,
  Funnel as RechartsFunnel,
  LabelList,
} from "recharts"
import { useRef } from "react"
import { FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Filter, X, ChevronLeft, ChevronRight, ZoomIn, ExternalLink, Image as ImageIcon, BarChart3, Plus, Calendar, MousePointerClick } from "lucide-react"
// -----------------------------
// Types
// -----------------------------
type RowData = Record<string, any>
type KPIValueMap = Record<string, number>

type DashboardConstant = {
  key: string
  value: number
  label?: string
  kind?: "static" | "filtered_agg"
  field?: string
  agg?: KPIOperation
  filterField?: string
  filterValue?: string
  categoriaField?: string  
  categoriaValue?: string  
}


type BrandingConfig = {
  heroImageUrl?: string
  heroTitle?: string
  heroSubtitle?: string
  heroTextColor?: string // NEW: color del texto en el hero
  heroOverlayOpacity?: number
  heroImageHeight?: number // NEW: altura de la imagen hero en px (default 160)
  galleryPhotoFields?: string[] // NEW: campos configurados que contienen fotos
  galleryMetadataFields?: string[] // NEW: campos a mostrar como metadata
  galleryImageHeight?: number // NEW: altura de las imágenes en px (default 500)
  kpiBackgroundColor?: string
  kpiTextColor?: string
  kpiBorderRadius?: number
  chartBackgroundColor?: string
  chartBorderRadius?: number
  galleryBackgroundColor?: string
  filterBackgroundColor?: string
  filterBorderRadius?: number
  filterTextColor?: string
  filterIconColor?: string
  kpiLabelColor?: string
  galleryMetadataFieldLabels?: Record<string, string>
}

type FilterCondition = {
  campo: string
  operador: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith"
  valor: any
  columnas?: number // NEW: tamaño del filtro (1-12)
}

type ReportFilters = {
  campanas?: string[]
  fechas?: {
    inicio?: string
    fin?: string
  }
  condiciones?: FilterCondition[]
}

// Extender KPIDefinition con columnas
type ExtendedKPI = KPIDefinition & {
  columnas?: number
  kind?: "field" | "formula" | "expression"
  expression?: string
}
// -----------------------------
// Helpers: filtering
// -----------------------------
function applyFilters(rows: RowData[], filters: ReportFilters | undefined): RowData[] {
  if (!filters) return rows

  let filtered = [...rows]

  // Filter by date range
  if (filters.fechas?.inicio || filters.fechas?.fin) {
    filtered = filtered.filter((row) => {
      const dateField = row.date || row.fecha
      if (!dateField) return true

      const rowDate = new Date(dateField)
      if (filters.fechas?.inicio) {
        const startDate = new Date(filters.fechas.inicio)
        if (rowDate < startDate) return false
      }
      if (filters.fechas?.fin) {
        const endDate = new Date(filters.fechas.fin)
        if (rowDate > endDate) return false
      }
      return true
    })
  }

  // Apply custom conditions
  if (filters.condiciones && filters.condiciones.length > 0) {
    filtered = filtered.filter((row) => {
      return filters.condiciones!.every((condition) => {
        // Skip empty conditions
        if (!condition.valor && condition.valor !== 0) return true

        const rowValue = row[condition.campo]
        const filterValue = condition.valor

        switch (condition.operador) {
          case "eq":
            return rowValue == filterValue
          case "ne":
            return rowValue != filterValue
          case "gt":
            return rowValue > filterValue
          case "gte":
            return rowValue >= filterValue
          case "lt":
            return rowValue < filterValue
          case "lte":
            return rowValue <= filterValue
          case "contains":
            return String(rowValue).toLowerCase().includes(String(filterValue).toLowerCase())
          case "startsWith":
            return String(rowValue).toLowerCase().startsWith(String(filterValue).toLowerCase())
          case "endsWith":
            return String(rowValue).toLowerCase().endsWith(String(filterValue).toLowerCase())
          default:
            return true
        }
      })
    })
  }

  return filtered
}

// Function of conversion to excel

function exportToExcel(data: any[], columnLabels?: Record<string, string>, filename?: string) {
  import("xlsx").then((XLSX) => {
    if (!data || data.length === 0) return
    const columns = Object.keys(data[0])
    
    // Construir header con etiquetas
    const header = columns.map(k => columnLabels?.[k] ?? k)
    
    // Construir filas
    const rows = data.map(row =>
      columns.map(k => {
        const v = row[k]
        return typeof v === "number" ? v : String(v ?? "")
      })
    )
    
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Datos")
    XLSX.writeFile(wb, `${filename ?? "tabla"}.xlsx`)
  })
}

// -----------------------------
// Helpers: numbers
// -----------------------------
function toNumber(v: any): number | null {
  if (v == null) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function median(nums: number[]): number {
  const a = [...nums].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

function variance(nums: number[]): number {
  if (nums.length === 0) return 0
  const m = nums.reduce((s, x) => s + x, 0) / nums.length
  return nums.reduce((s, x) => s + (x - m) ** 2, 0) / nums.length
}

function std(nums: number[]): number {
  return Math.sqrt(variance(nums))
}

function aggregateNumeric(values: number[], op: KPIOperation): number {
  if (op === "count") return values.length
  if (values.length === 0) return 0
  switch (op) {
    case "sum":
      return values.reduce((s, x) => s + x, 0)
    case "mean":
      return values.reduce((s, x) => s + x, 0) / values.length
    case "min":
      return Math.min(...values)
    case "max":
      return Math.max(...values)
    case "median":
      return median(values)
    case "std":
      return std(values)
    case "variance":
      return variance(values)
    default:
      return values.reduce((s, x) => s + x, 0)
  }
}

function countByField(rows: RowData[], field: string | "__rows__"): number {
  if (field === "__rows__") return rows.length
  let c = 0
  for (const r of rows) {
    const v = r?.[field]
    if (v !== null && v !== undefined && String(v).trim() !== "") c++
  }
  return c
}

// -----------------------------
// Helpers: formatting
// -----------------------------
function formatKpiValue(v: number, kpi: KPIDefinition): string {
  const dec = Math.max(0, Math.min(6, Number(kpi.decimales ?? 0)))
  const unidad = (kpi.unidad ?? "").trim()
  const fmt = (kpi.formato ?? "number") as any

  if (fmt === "percent") {
    const s = v.toFixed(dec) + "%"
    return unidad ? `${s} ${unidad}` : s
  }

  if (fmt === "currency") {
    if (unidad && /^[A-Z]{3}$/.test(unidad)) {
      try {
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: unidad,
          minimumFractionDigits: dec,
          maximumFractionDigits: dec,
        }).format(v)
      } catch {
        // fallback
      }
    }
    const s = v.toFixed(dec)
    return unidad ? `${s} ${unidad}` : s
  }

  const s = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v)
  return unidad ? `${s} ${unidad}` : s
}

// -----------------------------
// KPI computation (field + formula + const + num)
// -----------------------------
function computeBaseKpiValue(rows: RowData[], kpi: KPIDefinition): number {
  const op = kpi.operacion
  const fuente = kpi.fuente

  if (op === "count") {
    const cf = (kpi.countField ?? "__rows__") as any
    return countByField(rows, cf)
  }

  const nums: number[] = []
  for (const r of rows) {
    const n = toNumber(r?.[fuente])
    if (n != null) nums.push(n)
  }
  return aggregateNumeric(nums, op)
}

function parseOperandRef(raw: string) {
  const s = String(raw ?? "").trim()
  if (!s) return { kind: "empty" as const }
  if (s.startsWith("kpi:")) return { kind: "kpi" as const, id: s.slice(4) }
  if (s.startsWith("const:")) return { kind: "const" as const, key: s.slice(6) }
  if (s.startsWith("num:")) return { kind: "num" as const, value: Number(s.slice(4)) }
  return { kind: "kpi" as const, id: s }
}

function resolveOperand(
  raw: string,
  valuesById: KPIValueMap,
  constMap: Record<string, number>,
  kpiDefs?: KPIDefinition[]
): { ok: boolean; value: number } {
  const r = parseOperandRef(raw)
  if (r.kind === "num") return { ok: true, value: Number.isFinite(r.value) ? r.value : 0 }
  if (r.kind === "const") return { ok: true, value: Number(constMap[r.key] ?? 0) }
  if (r.kind === "kpi") {
    const has = Object.prototype.hasOwnProperty.call(valuesById, r.id)
    const rawVal = Number(valuesById[r.id] ?? 0)
    const escala = Number((kpiDefs?.find((k) => k.id === r.id) as any)?.escala ?? 1)
    const value = Number.isFinite(escala) && escala !== 0 && escala !== 1
      ? rawVal * escala
      : rawVal
    return { ok: has, value }
  }
  return { ok: false, value: 0 }
}

function computeFormulaKpiValue(kpi: KPIDefinition, valuesById: KPIValueMap, constMap: Record<string, number>, kpiDefs?: KPIDefinition[]): { ok: boolean; value: number } {
  const f = kpi.formula
  if (!f?.aKpiId || !f?.bKpiId || !f?.op) return { ok: false, value: 0 }

  const A = resolveOperand(f.aKpiId, valuesById, constMap, kpiDefs)
  const B = resolveOperand(f.bKpiId, valuesById, constMap, kpiDefs)

  if (!A.ok || !B.ok) return { ok: false, value: 0 }

  switch (f.op) {
    case "add":
      return { ok: true, value: A.value + B.value }
    case "sub":
      return { ok: true, value: A.value - B.value }
    case "mul":
      return { ok: true, value: A.value * B.value }
    case "div":
      return { ok: true, value: B.value === 0 ? 0 : A.value / B.value }
    case "pct":
      return { ok: true, value: B.value === 0 ? 0 : (A.value / B.value) * 100 }
    default:
      return { ok: true, value: 0 }
  }
}

// -----------------------------
// Chart dataset builder (groupBy + optional seriesBy)
// -----------------------------
function groupRows(rows: RowData[], groupBy: string): Map<string, RowData[]> {
  const m = new Map<string, RowData[]>()
  for (const r of rows) {
    const key = r?.[groupBy]
    const k = key == null || String(key).trim() === "" ? "(vacío)" : String(key)
    const arr = m.get(k) ?? []
    arr.push(r)
    m.set(k, arr)
  }
  return m
}

function uniqueSeriesValues(rows: RowData[], seriesBy: string): string[] {
  const s = new Set<string>()
  for (const r of rows) {
    const v = r?.[seriesBy]
    const k = v == null || String(v).trim() === "" ? "(vacío)" : String(v)
    s.add(k)
  }
  return Array.from(s.values())
}

type BuiltSeries = {
  data: any[]
  seriesKeys: { key: string; label: string; axis?: "left" | "right"; render?: "bar" | "line" }[]
}

function buildSeries(rows: RowData[], chart: ChartDefinition): BuiltSeries {
  const groupBy = chart.groupBy as string | undefined
  if (!groupBy) return { data: [], seriesKeys: [] }

  const mt = chart.measureType ?? "count"
  const metrics = (chart.metrics ?? []) as ChartMetricDefinition[]
  const seriesBy = chart.seriesBy as string | undefined

  const grouped = groupRows(rows, groupBy)
  const out: any[] = []

  if (!seriesBy) {
    const keys: BuiltSeries["seriesKeys"] = []

    for (const [name, bucket] of grouped.entries()) {
      const point: any = { name }

      if (mt === "count") {
        const cf = (chart.countField ?? "__rows__") as any
        point.value = countByField(bucket, cf)
      } else {
        if (metrics.length > 0) {
          for (const m of metrics) {
            const field = m.field as string
            const op = m.agg
            const nums: number[] = []
            for (const r of bucket) {
              const n = toNumber(r?.[field])
              if (n != null) nums.push(n)
            }
            const k = `${field}__${op}`
            point[k] = aggregateNumeric(nums, op)
          }
        } else if (chart.metric && chart.agg) {
          const field = chart.metric as string
          const op = chart.agg
          const nums: number[] = []
          for (const r of bucket) {
            const n = toNumber(r?.[field])
            if (n != null) nums.push(n)
          }
          point.value = aggregateNumeric(nums, op)
        }
      }

      out.push(point)
    }

    if (mt === "count") {
      keys.push({ key: "value", label: "count", axis: "left", render: "bar" })
    } else if (metrics.length > 0) {
      for (const m of metrics) keys.push({ key: `${m.field}__${m.agg}`, label: `${m.field} (${m.agg})`, axis: m.axis, render: m.render })
    } else if (chart.metric && chart.agg) {
      keys.push({ key: "value", label: `${chart.metric} (${chart.agg})`, axis: "left", render: "bar" })
    }

    return { data: out, seriesKeys: keys }
  }

  // con seriesBy: pivot
  const seriesValues = uniqueSeriesValues(rows, seriesBy)

  const keys: BuiltSeries["seriesKeys"] = []
  for (const sv of seriesValues) {
    if (mt === "count") {
      keys.push({ key: sv, label: sv, axis: "left", render: "bar" })
    } else if (metrics.length > 0) {
      for (const m of metrics) {
        keys.push({
          key: `${sv}__${m.field}__${m.agg}`,
          label: `${sv} · ${m.field} (${m.agg})`,
          axis: m.axis,
          render: m.render,
        })
      }
    } else if (chart.metric && chart.agg) {
      keys.push({ key: `${sv}__value`, label: `${sv} · ${chart.metric} (${chart.agg})`, axis: "left", render: "bar" })
    }
  }

  for (const [name, bucket] of grouped.entries()) {
    const point: any = { name }

    for (const sv of seriesValues) {
      const sub = bucket.filter((r) => {
        const v = r?.[seriesBy]
        const k = v == null || String(v).trim() === "" ? "(vacío)" : String(v)
        return k === sv
      })

      if (mt === "count") {
        const cf = (chart.countField ?? "__rows__") as any
        point[sv] = countByField(sub, cf)
      } else {
        if (metrics.length > 0) {
          for (const m of metrics) {
            const nums: number[] = []
            for (const r of sub) {
              const n = toNumber(r?.[m.field as string])
              if (n != null) nums.push(n)
            }
            point[`${sv}__${m.field}__${m.agg}`] = aggregateNumeric(nums, m.agg)
          }
        } else if (chart.metric && chart.agg) {
          const nums: number[] = []
          for (const r of sub) {
            const n = toNumber(r?.[chart.metric as string])
            if (n != null) nums.push(n)
          }
          point[`${sv}__value`] = aggregateNumeric(nums, chart.agg)
        }
      }
    }

    out.push(point)
  }

  return { data: out, seriesKeys: keys }
}

// -----------------------------
// Expression KPI evaluator
// -----------------------------
function evaluateExpressionKpi(
  expr: string,
  rows: RowData[],
  constMap: Record<string, number> = {},
  kpiValuesMap: Record<string, number> = {},
  kpiDefs: KPIDefinition[] = []
): number {
  if (!expr || !expr.trim()) return 0

  // Reemplazar {kpi:id} con el valor del KPI (aplicando escala si existe)
  let math = expr.replace(/\{kpi:([^}]+)\}/g, (_, id) => {
    const rawVal = kpiValuesMap[id.trim()] ?? 0
    const escala = Number((kpiDefs.find((k) => k.id === id.trim()) as any)?.escala ?? 1)
    const val = Number.isFinite(escala) && escala !== 0 && escala !== 1 ? rawVal * escala : rawVal
    return String(val)
  })

  // Reemplazar {const_key} con valores de constantes
  math = math.replace(/\{([^}]+)\}/g, (_, key) => {
    return String(constMap[key.trim()] ?? 0)
  })
  // Replace [FieldName] tokens with sum aggregate
  math = math.replace(/\[([^\]]+)\]/g, (_, field) => {
    const nums = rows
      .map((r) => toNumber(r?.[field.trim()]))
      .filter((n): n is number => n !== null)
    return String(aggregateNumeric(nums, "sum"))
  })
  math = math.trim()
  // Only allow safe math characters
  if (!/^[\d\s+\-*/().]+$/.test(math)) return 0
  try {
    // eslint-disable-next-line no-new-func
    return Number(new Function(`"use strict"; return (${math})`)())
  } catch {
    return 0
  }
}

// -----------------------------
// Metadata value formatter
// -----------------------------
function formatMetadataValue(value: any): string {
  if (value == null || value === "") return "N/A"
  const str = String(value)
  // ISO date: YYYY-MM-DD or YYYY-MM-DDTHH:mm...
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
    }
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split("/")
    const d = new Date(Number(year), Number(month) - 1, Number(day))
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
    }
  }
  return str
}

// -----------------------------
// UI pieces
// -----------------------------
function KpiCard({ 
  title, 
  value,
  columnas, 
  branding 
}: { 
  title: string
  value: string
  columnas: number
  branding?: BrandingConfig
}) {
  return (
    <div 
      className="border p-4" 
      style={{ 
        gridColumn: `span ${Math.round(columnas * 4)} / span ${Math.round(columnas * 4)}`,
        backgroundColor: branding?.kpiBackgroundColor || "#ffffff",
        color: branding?.kpiTextColor || "#000000",
        borderRadius: `${branding?.kpiBorderRadius ?? 8}px`,
      }}
    >
      <div className="text-xs" style={{ color: branding?.kpiLabelColor ?? "#6b7280" }}>{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

// Evidence Gallery Component
function EvidenceGallery({
  rows,
  photoFields,
  metadataFields,
  metadataFieldLabels,
  imageHeight = 500,
  backgroundColor = "#f8fafc",
  imageBackground = "#000000",
  metadataBackground = "#f1f5f9",
  metadataCols = 2,
}: {
  rows: RowData[]
  photoFields: string[]
  metadataFields?: string[]
  metadataFieldLabels?: Record<string, string>
  imageHeight?: number
  backgroundColor?: string
  imageBackground?: string
  metadataBackground?: string
  metadataCols?: number
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Extraer todas las fotos de todas las filas
  const allPhotos = useMemo(() => {
    const photos: Array<{ url: string; field: string; rowData: RowData; index: number }> = []
    
    rows.forEach((row, rowIndex) => {
      photoFields.forEach(field => {
        const value = row[field]
        if (!value) return

        // Extraer URLs - puede ser string directo, objeto {text, hyperlink}, o múltiples separadas por comas
        let urls: string[] = []
        
        if (typeof value === 'object' && value !== null) {
          // Si es objeto con hyperlink o text
          const urlStr = value.hyperlink || value.text
          if (urlStr) {
            urls = String(urlStr).split(',').map(u => u.trim()).filter(Boolean)
          }
        } else {
          // Si es string directo
          urls = String(value).split(',').map(u => u.trim()).filter(Boolean)
        }
        
        urls.forEach(url => {
          let imageUrl = url
          
          // Para Google Drive, convertir al formato thumbnail y usar proxy
          if (url.includes('drive.google.com')) {
            // Extraer ID de diferentes formatos
            const idMatch = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/?]+)/)
            if (idMatch) {
              const fileId = idMatch[1]
              const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
              // Usar proxy para evitar CORS
              imageUrl = `/api/proxy-image?url=${encodeURIComponent(driveUrl)}`
            }
          }
          
          photos.push({
            url: imageUrl,
            field,
            rowData: row,
            index: rowIndex,
          })
        })
      })
    })
    
    return photos
  }, [rows, photoFields])

  const currentPhoto = allPhotos[currentIndex]

  const goNext = () => {
    if (currentIndex < allPhotos.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (allPhotos.length === 0) {
    return (
      <Card style={{ backgroundColor }}>
        <CardContent className="py-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No se encontraron fotos en los datos filtrados.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifica que existan campos con URLs de imágenes.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Determinar qué campos mostrar en metadata
  const displayMetadataFields = useMemo(() => {
    if (metadataFields && metadataFields.length > 0) {
      // Usar campos configurados manualmente
      return metadataFields.filter(Boolean)
    }
    
    // Fallback: mostrar primeros campos que no sean fotos
    return Object.keys(currentPhoto.rowData)
      .filter(key => !photoFields.includes(key))
      .slice(0, 6)
  }, [metadataFields, currentPhoto.rowData, photoFields])

  return (
    <div className="space-y-4">
      {/* Main Image Card */}
      <Card style={{ backgroundColor }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {currentPhoto.field}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} de {allPhotos.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            className="relative rounded-lg overflow-hidden flex items-center justify-center" 
            style={{ height: `${imageHeight}px`, backgroundColor: imageBackground }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.url}
              alt={`Evidencia ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={() => setSelectedImage(currentPhoto.url)}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `
                    <div class="flex items-center justify-center h-full text-muted-foreground">
                      <div class="text-center">
                        <svg class="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <p>Error al cargar imagen</p>
                        <a href="${currentPhoto.url}" target="_blank" class="text-xs underline mt-2 inline-block">Abrir enlace original</a>
                      </div>
                    </div>
                  `
                }
              }}
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedImage(currentPhoto.url)}
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                Ampliar
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={currentPhoto.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </a>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={currentIndex === allPhotos.length - 1}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Thumbnail Strip */}
          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {allPhotos.slice(
                Math.max(0, currentIndex - 5),
                Math.min(allPhotos.length, currentIndex + 6)
              ).map((photo, idx) => {
                const actualIndex = Math.max(0, currentIndex - 5) + idx
                return (
                  <button
                    key={actualIndex}
                    onClick={() => setCurrentIndex(actualIndex)}
                    className={`flex-shrink-0 rounded border-2 overflow-hidden transition-all ${
                      actualIndex === currentIndex
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/20'
                    }`}
                    style={{ width: '80px', height: '80px' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Miniatura ${actualIndex + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Photo Metadata */}
          <div className="mt-4 p-3 rounded-lg text-sm border" style={{ backgroundColor: metadataBackground }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${metadataCols}, minmax(0, 1fr))` }}>
              <div>
                <span className="font-medium">Campo:</span> {currentPhoto.field}
              </div>
              <div>
                <span className="font-medium">Registro:</span> #{currentPhoto.index + 1}
              </div>
              {displayMetadataFields.map((key) => (
                <div key={key}>
                  <span className="font-medium">
                    {metadataFieldLabels?.[key] || key}:
                  </span>{" "}
                  {formatMetadataValue(currentPhoto.rowData[key])}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Zoom Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Vista ampliada</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto max-h-[80vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Imagen ampliada"
                className="w-full h-auto"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function FilterCombobox({
  options,
  value,
  onChange,
  disabled,
  cardBackground,
  textColor,
  cardBorderRadius,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  cardBackground?: string
  textColor?: string
  cardBorderRadius?: number
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    try {
      const re = new RegExp(query.trim(), "i")
      return options.filter((o) => re.test(o))
    } catch {
      return options.filter((o) =>
        o.toLowerCase().includes(query.toLowerCase())
      )
    }
  }, [options, query])

  return (
    <div className="relative">
      <div
        className="flex items-center border rounded px-2 gap-1 cursor-text"
        style={{
          backgroundColor: cardBackground || "var(--background)",
          color: textColor || "inherit",
          borderRadius: `${cardBorderRadius ?? 6}px`,
          borderColor: textColor ? `${textColor}40` : undefined,
        }}
        onClick={() => { if (!disabled) setOpen(true) }}
      >
        <input
          className="flex-1 py-1.5 text-sm bg-transparent outline-none"
          style={{ color: textColor || "inherit" }}
          placeholder={value
            ? (/^\d{4}-\d{2}-\d{2}T/.test(value)
                ? new Date(value).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
                : value)
            : "Buscar…"}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {value && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs shrink-0"
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setQuery("") }}
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto border shadow-md text-sm"
          style={{
            backgroundColor: cardBackground || "var(--popover)",
            color: textColor || "inherit",
            borderRadius: `${cardBorderRadius ?? 6}px`,
          }}
        >
          <div
            className="px-3 py-1.5 cursor-pointer hover:opacity-80"
            style={{ opacity: 0.6 }}
            onMouseDown={() => { onChange(""); setQuery(""); setOpen(false) }}
          >
            Todos
          </div>
          {filtered.slice(0, 100).map((opt) => {
            const displayOpt = /^\d{4}-\d{2}-\d{2}T/.test(opt)
              ? new Date(opt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
              : opt
            return (
              <div
                key={opt}
                className={`px-3 py-1.5 cursor-pointer hover:bg-muted ${opt === value ? "bg-muted font-medium" : ""}`}
                onMouseDown={() => { onChange(opt); setQuery(""); setOpen(false) }}
              >
                {displayOpt}
              </div>
            )
          })}
          {filtered.length > 100 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-t">
              {filtered.length - 100} más — refina la búsqueda
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FieldSearchSelect({
  value, onValueChange, fields,
}: {
  value: string
  onValueChange: (v: string) => void
  fields: string[]
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    if (!query.trim()) return fields
    return fields.filter(f => f.toLowerCase().includes(query.toLowerCase()))
  }, [fields, query])

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="text-xs">
        <SelectValue placeholder="Campo" />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
          <input
            className="w-full text-xs border rounded px-2 py-1 bg-background outline-none"
            placeholder="Buscar campo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
        ) : (
          filtered.map((field) => (
            <SelectItem key={field} value={field}>{field}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

// Filter Panel Component - Clean design with theme colors
function FilterPanel({
  filters,
  onFiltersChange,
  availableFields,
  campaignId,
  rows,
  cardBackground,
  cardBorderRadius,
  textColor,
  iconColor,
  defaultFilterCols = 3,
}: {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  availableFields: string[]
  campaignId?: string
  rows: RowData[]
  cardBackground?: string
  cardBorderRadius?: number
  textColor?: string
  iconColor?: string
  defaultFilterCols?: number
}) {
  
  const [tempFilters, setTempFilters] = useState<ReportFilters>(filters)
  const [filterOptions, setFilterOptions] = useState<Record<string, any[]>>({})
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({})
  useEffect(() => {
    for (const condition of tempFilters.condiciones ?? []) {
      if (condition.campo) {
        loadFieldOptions(condition.campo)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])
  const loadFieldOptions = async (fieldName: string) => {
    if (!campaignId || (filterOptions[fieldName] !== undefined && filterOptions[fieldName].length > 0) || loadingOptions[fieldName]) return
    
    setLoadingOptions(prev => ({ ...prev, [fieldName]: true }))
    try {
      const { getFilterOptions } = await import("@/lib/api/campaignApi")
      console.log(`[FilterPanel] Loading options for field: "${fieldName}"`)
      const response = await getFilterOptions(campaignId, [fieldName])
      console.log(`[FilterPanel] Response for "${fieldName}":`, response)
      
      // El backend puede devolver en varios formatos:
      // 1. response.options[fieldName] = [{value, label}]
      // 2. response[fieldName] = [{value, label}] o [string, string, ...]
      let fieldData = response.options?.[fieldName] || response[fieldName] || []
      
      console.log(`[FilterPanel] Field data for "${fieldName}":`, fieldData)
      
      if (!Array.isArray(fieldData) || fieldData.length === 0) {
        console.warn(`[FilterPanel] No data from backend for field "${fieldName}", extracting from local data`)
        
        // FALLBACK: Extraer valores únicos del dataset local
        const uniqueValues = new Set<string>()
        rows.forEach(row => {
          const actualKey = Object.keys(row).find(
            k => k.toLowerCase() === fieldName.toLowerCase()
          ) ?? fieldName
          const value = row[actualKey]
          if (value !== null && value !== undefined && value !== '') {
            const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
            uniqueValues.add(strValue)
          }
        })
        
        fieldData = Array.from(uniqueValues).sort()
        console.log(`[FilterPanel] Extracted ${fieldData.length} unique values from local data for "${fieldName}":`, fieldData.slice(0, 5))
      }
      
      if (!Array.isArray(fieldData) || fieldData.length === 0) {
        console.warn(`[FilterPanel] Still no data found for field "${fieldName}" after fallback`)
        setFilterOptions(prev => ({ ...prev, [fieldName]: [] }))
        return
      }
      
      const values = fieldData.map(item => 
        typeof item === 'object' && item !== null ? (item.value ?? item.label ?? item) : item
      )
      
      console.log(`[FilterPanel] Extracted values for "${fieldName}":`, values)
      setFilterOptions(prev => ({ ...prev, [fieldName]: values }))
    } catch (error) {
      console.error(`[FilterPanel] Error loading options for "${fieldName}":`, error)
      setFilterOptions(prev => ({ ...prev, [fieldName]: [] }))
    } finally {
      setLoadingOptions(prev => ({ ...prev, [fieldName]: false }))
    }
  }
  
  const updateTempDateRange = (field: "inicio" | "fin", value: string) => {
    setTempFilters({
      ...tempFilters,
      fechas: {
        ...tempFilters.fechas,
        [field]: value,
      },
    })
  }

  const updateTempCondition = (index: number, field: keyof FilterCondition, value: any) => {
    const newConditions = [...(tempFilters.condiciones || [])]
    
    if (field === "campo" && value !== newConditions[index].campo) {
      loadFieldOptions(value)
      newConditions[index] = {
        ...newConditions[index],
        [field]: value,
        valor: "",
      }
    } else {
      newConditions[index] = {
        ...newConditions[index],
        [field]: value,
      }
    }
    
    setTempFilters({
      ...tempFilters,
      condiciones: newConditions,
    })
  }

  const addCondition = () => {
    const defaultCols = defaultFilterCols ?? 3
    setTempFilters({
      ...tempFilters,
      condiciones: [
        ...(tempFilters.condiciones || []),
        { campo: "", operador: "eq", valor: "", columnas: defaultCols },
      ],
    })
  }

  const removeCondition = (index: number) => {
    const newConditions = [...(tempFilters.condiciones || [])]
    newConditions.splice(index, 1)
    const next = { ...tempFilters, condiciones: newConditions }
    setTempFilters(next)
    onFiltersChange(next)  // aplica inmediatamente
  }

  const applyFilters = () => {
    onFiltersChange(tempFilters)
  }

  const resetFilters = () => {
    const emptyFilters = {
      fechas: {},
      condiciones: [],
    }
    setTempFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters =
    tempFilters.fechas?.inicio ||
    tempFilters.fechas?.fin ||
    (tempFilters.condiciones && tempFilters.condiciones.some((c) => c.valor))
  
  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Filtros</h2>
        <div className="flex gap-2">
          <Button
            onClick={applyFilters}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
            disabled={false}
          >
            <Filter className="h-4 w-4 mr-2" />
            Aplicar filtros
          </Button>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Filter Cards Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
        {/* <div className="border p-4 shadow-sm" style={{ backgroundColor: cardBackground || "var(--card)", borderRadius: `${cardBorderRadius ?? 8}px`, color: textColor || "inherit" }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4" style={{ color: iconColor || undefined }} />
            <label className="text-sm font-semibold">Fecha</label>
          </div>
          <p className="text-xs mb-3" style={{ opacity: 0.6 }}>Operador: eq</p>
          <Select
            value={tempFilters.fechas?.inicio || "all"}
            onValueChange={(value) => updateTempDateRange("inicio", value === "all" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="2026-01-11">2026-01-11</SelectItem>
              <SelectItem value="2026-01-18">2026-01-18</SelectItem>
              <SelectItem value="2026-01-22">2026-01-22</SelectItem>
              <SelectItem value="2026-01-23">2026-01-23</SelectItem>
              <SelectItem value="2026-01-25">2026-01-25</SelectItem>
              <SelectItem value="2026-02-01">2026-02-01</SelectItem>
            </SelectContent>
          </Select>
        </div> */}

        {/* Fecha Fin */}
        {/* <div className="border p-4 shadow-sm" style={{ backgroundColor: cardBackground || "var(--card)", borderRadius: `${cardBorderRadius ?? 8}px`, color: textColor || "inherit" }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4" style={{ color: iconColor || undefined }} />
            <label className="text-sm font-semibold">Fecha</label>
          </div>
          <p className="text-xs mb-3" style={{ opacity: 0.6 }}>Operador: eq</p>
          <Select
            value={tempFilters.fechas?.fin || "all"}
            onValueChange={(value) => updateTempDateRange("fin", value === "all" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="2026-01-11">2026-01-11</SelectItem>
              <SelectItem value="2026-01-18">2026-01-18</SelectItem>
              <SelectItem value="2026-01-22">2026-01-22</SelectItem>
              <SelectItem value="2026-01-23">2026-01-23</SelectItem>
              <SelectItem value="2026-01-25">2026-01-25</SelectItem>
              <SelectItem value="2026-02-01">2026-02-01</SelectItem>
            </SelectContent>
          </Select>
        </div> */}

        {/* Dynamic Condition Filters */}
        {tempFilters.condiciones?.map((condition, index) => {
          const fieldOptions = filterOptions[condition.campo] || []
          const isLoadingFieldOptions = loadingOptions[condition.campo]
          
          return (
            <div key={index} className="border p-3 shadow-sm relative" style={{
              backgroundColor: cardBackground || "var(--card)",
              borderRadius: `${cardBorderRadius ?? 8}px`,
              color: textColor || "inherit",
              gridColumn: `span ${Math.max(3, condition.columnas ?? 3)} / span ${Math.max(3, condition.columnas ?? 3)}`,
            }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(index)}
                className="absolute top-2 right-2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" style={{ color: iconColor || undefined }} />
                <label className="text-sm font-semibold">
                  {condition.campo || "Campo"}
                </label>
              </div>
              <p className="text-xs mb-3" style={{ opacity: 0.6 }}>Operador: {condition.operador}</p>

              <div className="space-y-2">
                <FieldSearchSelect
                  value={condition.campo}
                  onValueChange={(value) => updateTempCondition(index, "campo", value)}
                  fields={availableFields}
                />

                {condition.campo && fieldOptions.length > 0 ? (
                  fieldOptions.length > 7 ? (
                    <FilterCombobox
                      options={fieldOptions.map(String)}
                      value={condition.valor || ""}
                      onChange={(value) => updateTempCondition(index, "valor", value)}
                      disabled={isLoadingFieldOptions}
                    />
                  ) : (
                    <Select
                      value={condition.valor || "all"}
                      onValueChange={(value) => updateTempCondition(index, "valor", value === "all" ? "" : value)}
                      disabled={isLoadingFieldOptions}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingFieldOptions ? "Cargando..." : "Todos"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {fieldOptions.map((opt, i) => (
                          <SelectItem key={i} value={String(opt)}>
                            {String(opt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Filter Button */}
      {availableFields.length > 0 && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={addCondition}
            className="text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar filtro
          </Button>
        </div>
      )}
    </div>
  )
}

function GroupedTable({
  data, groupByField, displayFields, columnLabels, columnWidths, rowHeight, showSubtotals,
}: {
  data: RowData[]
  groupByField: string
  displayFields: string[]
  columnLabels?: Record<string, string>
  columnWidths?: Record<string, number>
  rowHeight?: number
  showSubtotals?: boolean
}) {
  const groups = useMemo(() => groupRows(data, groupByField), [data, groupByField])
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null)
  const sortedGroups = useMemo(() => {
    const entries = Array.from(groups.entries())
    if (!sortDir) return entries
    return entries.sort(([a], [b]) =>
      sortDir === "asc"
        ? a.localeCompare(b, "es", { sensitivity: "base" })
        : b.localeCompare(a, "es", { sensitivity: "base" })
    )
  }, [groups, sortDir])
  const numericDisplayFields = useMemo(() => {
    if (!showSubtotals || data.length === 0) return []
    return displayFields.filter(f =>
      data.some(r => !isNaN(Number(r[f])) && r[f] !== "" && r[f] != null)
    )
  }, [data, displayFields, showSubtotals])

  const allDisplayFields = useMemo(() => {
    if (!showSubtotals || numericDisplayFields.length === 0) return displayFields
    return ["__suma__", ...displayFields]
  }, [displayFields, showSubtotals, numericDisplayFields])
  return (
    <div className="overflow-auto relative">
      <table className="min-w-[520px] w-full text-sm border-collapse table-fixed">
        <colgroup>
          {[groupByField, ...allDisplayFields].map(k => (
            <col key={k} style={{ width: columnWidths?.[k] ? `${columnWidths[k]}px` : undefined }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="border-b">
            {[groupByField, ...allDisplayFields].map(k => (
              <th key={k}
                className="text-left px-2 font-medium select-none bg-background border-b shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
                style={{ paddingTop: rowHeight ?? 8, paddingBottom: rowHeight ?? 8,
                  width: columnWidths?.[k] ? `${columnWidths[k]}px` : undefined }}
                onClick={() => {
                  if (k !== groupByField) return
                  setSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc")
                }}>
                <div className="flex items-center gap-1">
                  <span>{k === "__suma__" ? "Suma" : (columnLabels?.[k] ?? k)}</span>
                  {k === groupByField && (
                    <span className="text-xs text-muted-foreground">
                      {sortDir === "asc" ? "A→Z" : sortDir === "desc" ? "Z→A" : "↕"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map(([groupName, rows]) =>
            rows.map((row, rowIdx) => (
              <tr key={`${groupName}_${rowIdx}`} className="border-b hover:bg-muted/30 transition-colors">
                {rowIdx === 0 && (
                  <td rowSpan={rows.length}
                    className="px-2 font-medium align-middle border-r bg-muted/10"
                    style={{
                      paddingTop: rowHeight ?? 8,
                      paddingBottom: rowHeight ?? 8,
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      backgroundColor: "var(--background)",
                    }}>
                    {groupName}
                  </td>
                )}
                {allDisplayFields.map(f => {
                  if (f === "__suma__") {
                    if (rowIdx !== 0) return null
                    const groupSum = rows.reduce((acc, r) =>
                      acc + numericDisplayFields.reduce((s, col) => s + (Number(r[col]) || 0), 0), 0)
                    return (
                      <td key={f} rowSpan={rows.length} className="px-2 font-medium align-middle"
                        style={{ paddingTop: rowHeight ?? 8, paddingBottom: rowHeight ?? 8 }}>
                        {groupSum.toLocaleString("es-CO")}
                      </td>
                    )
                  }
                  return (
                    <td key={f} className="px-2"
                      style={{ paddingTop: rowHeight ?? 8, paddingBottom: rowHeight ?? 8 }}>
                      {String(row[f] ?? "")}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// -----------------------------
// Sortable Table Component
// -----------------------------
function SortableTable({
  data,
  rowHeight,
  columnLabels,
  columnWidths,
  showTotals,
  showSubtotals,
}: {
  data: any[]
  rowHeight?: number
  columnLabels?: Record<string, string>
  columnWidths?: Record<string, number>
  showTotals?: boolean
  showSubtotals?: boolean
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const columns = Object.keys(data?.[0] ?? {})

  const numCols = useMemo(() => {
    if (!showSubtotals || data.length === 0) return []
    return columns.slice(1).filter(col =>
      data.some(r => !isNaN(Number(r[col])) && r[col] !== "")
    )
  }, [data, columns, showSubtotals])

  const displayColumns = useMemo(() => {
    if (!showSubtotals || numCols.length === 0) return columns
    return [columns[0], "__suma__", ...columns.slice(1)]
  }, [columns, showSubtotals, numCols])

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const an = Number(av)
      const bn = Number(bv)
      const isNum = !isNaN(an) && !isNaN(bn)
      let cmp = isNum ? an - bn : String(av ?? "").localeCompare(String(bv ?? ""), "es", { sensitivity: "base" })
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const totalsRow = useMemo(() => {
    if (!showTotals || data.length === 0) return null
    const totals: Record<string, any> = {}
    for (const col of columns) {
      if (col === columns[0]) { totals[col] = "Total"; continue }
      const nums = data.map(r => Number(r[col])).filter(n => !isNaN(n))
      totals[col] = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : ""
    }
    return totals
  }, [data, columns, showTotals])

  const getCellValue = (row: any, k: string) => {
    if (k === "__suma__") {
      return numCols.reduce((acc, col) => acc + (Number(row[col]) || 0), 0).toLocaleString("es-CO")
    }
    return String(row[k] ?? "")
  }

  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sin datos.</p>

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="min-w-[520px] w-full text-sm">
          <thead>
            <tr className="border-b">
              {displayColumns.map((k) => {
                const isActive = sortKey === k
                const isNum = k !== "__suma__" && !isNaN(Number(data[0]?.[k]))
                return (
                  <th
                    key={k}
                    className="text-left px-2 font-medium cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    style={{
                      paddingTop: rowHeight ?? 8,
                      paddingBottom: rowHeight ?? 8,
                      width: k !== "__suma__" && columnWidths?.[k] ? `${columnWidths[k]}px` : undefined,
                      minWidth: k !== "__suma__" && columnWidths?.[k] ? `${columnWidths[k]}px` : undefined,
                    }}
                    onClick={() => k !== "__suma__" && handleSort(k)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{k === "__suma__" ? "Suma" : (columnLabels?.[k] ?? k)}</span>
                      {k !== "__suma__" && (
                        <span className="text-xs text-muted-foreground">
                          {isActive ? (sortDir === "asc" ? (isNum ? "↑" : "A→Z") : (isNum ? "↓" : "Z→A")) : "↕"}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                {displayColumns.map((k) => (
                  <td key={k} className="px-2"
                    style={{ paddingTop: rowHeight ?? 8, paddingBottom: rowHeight ?? 8,
                      width: k !== "__suma__" && columnWidths?.[k] ? `${columnWidths[k]}px` : undefined }}>
                    {getCellValue(row, k)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalsRow && (
        <div className="shrink-0 border-t-2 bg-muted/20 overflow-hidden">
          <table className="min-w-[520px] w-full text-sm">
            <tbody>
              <tr>
                {displayColumns.map((k) => (
                  <td key={k} className="px-2 font-semibold"
                    style={{ paddingTop: rowHeight ?? 8, paddingBottom: rowHeight ?? 8,
                      width: k !== "__suma__" && columnWidths?.[k] ? `${columnWidths[k]}px` : undefined }}>
                    {k === "__suma__"
                      ? numCols.reduce((acc, col) => acc + (Number(totalsRow[col]) || 0), 0).toLocaleString("es-CO")
                      : typeof totalsRow[k] === "number"
                      ? totalsRow[k].toLocaleString("es-CO")
                      : totalsRow[k] ?? ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// -----------------------------
// Main component
// -----------------------------
export function DashboardFromConfig({
  config,
  data,
  campaignId,
}: {
  config: ReportConfiguration
  data?: unknown
  campaignId?: string
}) {
  const branding = ((config as any)?.branding ?? {}) as BrandingConfig
  const constants = (((config as any)?.constantes ?? []) as DashboardConstant[]) || []
  
  // Estado para URL pública de la imagen hero (convierte gs:// a URL firmada)
  const [heroImagePublicUrl, setHeroImagePublicUrl] = useState<string | null>(null)
  const [chartFilter, setChartFilter] = useState<{ field: string; value: string } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  // Efecto para cargar URL pública si es gsUri
  const handleExportPdf = async () => {
  if (!printRef.current) return
  setIsExporting(true)

  // Parchear getComputedStyle para interceptar colores oklch/lab
  const originalGetComputedStyle = window.getComputedStyle.bind(window)
  ;(window as any).getComputedStyle = (element: Element, pseudo?: string | null) => {
    const style = originalGetComputedStyle(element, pseudo)
    return new Proxy(style, {
      get(target, prop) {
        const value = (target as any)[prop]
        if (typeof value === "string" && (value.includes("oklch") || value.includes("lab("))) {
          return "#000000"
        }
        if (typeof value === "function") {
          return value.bind(target)
        }
        return value
      },
    })
  }

  try {
    const html2pdf = (await import("html2pdf.js")).default
    await html2pdf()
      .set({
        margin: 8,
        filename: `${config.campaignNombre ?? "dashboard"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "px",
          format: [
            printRef.current!.scrollWidth + 16,
            printRef.current!.scrollHeight + 16,
          ],
          orientation: "portrait",
        },
      })
      .from(printRef.current)
      .save()
  } finally {
    window.getComputedStyle = originalGetComputedStyle
    setIsExporting(false)
  }
}

  useEffect(() => {
    const heroImageUrl = branding.heroImageUrl
    if (!heroImageUrl) {
      setHeroImagePublicUrl(null)
      return
    }
    // Si es gsUri, convertir a URL pública firmada
    if (heroImageUrl.startsWith("gs://")) {
      ;(async () => {
        try {
          const { getAssetReadUrl } = await import("@/lib/api/campaignApi")
          const publicUrl = await getAssetReadUrl(heroImageUrl, 120) // válida por 2 horas
          setHeroImagePublicUrl(publicUrl)
        } catch (error) {
          console.error("Error loading hero image from GCS:", error)
          setHeroImagePublicUrl(null)
        }
      })()
    } else {
      // Si es URL directa o dataURL legacy, usar directamente
      setHeroImagePublicUrl(heroImageUrl)
    }
  }, [branding.heroImageUrl])
  
  // Extract filters from config - pero NO aplicar fechas pre-configuradas
  const configFilters = ((config as any)?.filtros ?? {}) as ReportFilters
  
  // State for user-adjustable filters (inicializar sin filtros de fecha)
  const [userFilters, setUserFilters] = useState<ReportFilters>({
    fechas: {}, // Vacío por defecto
    condiciones: configFilters.condiciones || [],
  })

  const { rows, dataBySlot } = useMemo<{ rows: RowData[]; dataBySlot: Record<string, RowData[]> }>(() => {
    
    
    if (Array.isArray(data)) {
      return { rows: data as RowData[], dataBySlot: { primary: data as RowData[] } }
    }
    if (!data) return { rows: [], dataBySlot: {} }

    const d = data as any

    // Nuevo formato multi-slot
    if (d.dataBySlot && typeof d.dataBySlot === "object") {
      const bySlot = d.dataBySlot as Record<string, RowData[]>
      const primaryRows = bySlot["primary"] ?? Object.values(bySlot)[0] ?? []
      return { rows: primaryRows, dataBySlot: bySlot }
    }

    if (Array.isArray(d.rows)) return { rows: d.rows as RowData[], dataBySlot: { primary: d.rows } }
    if (Array.isArray(d.data)) return { rows: d.data as RowData[], dataBySlot: { primary: d.data } }
    if (Array.isArray(d.items)) return { rows: d.items as RowData[], dataBySlot: { primary: d.items } }

    console.warn("[DashboardFromConfig] data no es array:", data)
    return { rows: [], dataBySlot: {} }
  }, [data])
  // Apply filters to data
  const filteredRows = useMemo(() => {
    let result = applyFilters(rows, userFilters)
    if (chartFilter) {
      result = result.filter((r) => String(r?.[chartFilter.field] ?? "") === chartFilter.value)
    }
    return result
  }, [rows, userFilters, chartFilter])

  // Get available fields from data
  const availableFields = useMemo(() => {
    const configFilterableFields = (config as any).filterableFields as string[] | undefined
    
    // Si hay campos configurados explícitamente, usar solo esos
    if (configFilterableFields && configFilterableFields.length > 0) {
      return configFilterableFields
    }
    
    // Fallback: todos los campos de todos los slots
    const allKeys = new Set<string>()
    for (const slotRows of Object.values(dataBySlot)) {
      if (slotRows.length > 0) {
        for (const key of Object.keys(slotRows[0])) {
          allKeys.add(key)
        }
      }
    }
    return Array.from(allKeys).sort()
  }, [dataBySlot, config])
  // Datos de todos los slots CON filtros de usuario (para constantes filtered_agg)
  const allSlotsRows = useMemo(() => {
    const combined = Object.values(dataBySlot).flat()
    let result = applyFilters(combined, userFilters)
    if (chartFilter) {
      result = result.filter((r) => String(r?.[chartFilter.field] ?? "") === chartFilter.value)
    }
    return result
  }, [dataBySlot, userFilters, chartFilter])
   const allSlotsRowsUnfiltered = useMemo(() => {
    return Object.values(dataBySlot).flat()
  }, [dataBySlot])
  const constMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of constants) {
      if (!c?.key) continue
      const kind = c.kind ?? "static"
      if (kind === "static") {
        m[c.key] = Number(c.value ?? 0)
      } else if (kind === "filtered_agg") {
        if (c.field) {
          let subset = c.filterField && c.filterValue
            ? allSlotsRows.filter((r) => String(r?.[c.filterField!] ?? "") === c.filterValue)
            : allSlotsRows

          if (c.categoriaField && c.categoriaValue) {
            subset = subset.filter((r) => String(r?.[c.categoriaField!] ?? "") === c.categoriaValue)
          }

          const nums = c.field === "__rows__"
          ? subset.map(() => 1)
          : subset.map((r) => toNumber(r?.[c.field!])).filter((n): n is number => n !== null)
          m[c.key] = c.field === "__rows__" ? subset.length : aggregateNumeric(nums, c.agg ?? "sum")
        } else {
          if (c.categoriaField && c.categoriaValue) {
          const filtroActivo = (userFilters.condiciones ?? []).find(
            (f) => f.campo === c.categoriaField && f.valor && f.operador === "eq"
          )
          const chartFilterActivo = chartFilter?.field === c.categoriaField

          if (filtroActivo && String(filtroActivo.valor) !== c.categoriaValue) {
            m[c.key] = 0
          } else if (chartFilterActivo && chartFilter?.value !== c.categoriaValue) {
            m[c.key] = 0
          } else {
            m[c.key] = Number(c.value ?? 0)
          }
        } else {
          m[c.key] = Number(c.value ?? 0)
        }
        }
      }
    }
    return m
  }, [constants, allSlotsRows, userFilters, chartFilter])

  const palette = useMemo(() => {
    const p = config.paletaColores
    return [
      p?.acento || "#FFB000",
      p?.primario || "#000000",
      "#4F46E5",
      "#10B981",
      "#F97316",
      "#06B6D4",
      "#A855F7",
    ]
  }, [config.paletaColores])

  // KPIs computation — usan todos los slots combinados
  const { kpiValues, visibleKpis } = useMemo(() => {
    const kpis = (config.kpis ?? []) as ExtendedKPI[]
    const visible = kpis
  .filter((k) => k.visible !== false)
  .sort((a, b) => ((a as any).orden ?? 999) - ((b as any).orden ?? 999))
    const byId: KPIValueMap = {}

     // pass 1: field + expression
  const getSlotRowsForField = (fieldName: string): RowData[] => {
    if (!fieldName) return allSlotsRows
    for (const [slot, slotRows] of Object.entries(dataBySlot)) {
      const sample = slotRows.find(r => r?.[fieldName] != null && r?.[fieldName] !== "")
      if (sample) {
        const globalFieldMap = ((config as any).slotFieldMap ?? []) as { from: string; to: string; slot: string }[]
        const slotMap = globalFieldMap.filter(m => m.slot === slot)
        const translatedFilters: ReportFilters = slotMap.length > 0 ? {
          ...userFilters,
          condiciones: (userFilters.condiciones ?? []).map(cond => {
            const mapped = slotMap.find(m => m.from === cond.campo)
            return mapped ? { ...cond, campo: mapped.to } : cond
          })
        } : userFilters
        let r = applyFilters(slotRows, translatedFilters)
        if (chartFilter) {
          const mappedField = slotMap.find(m => m.from === chartFilter.field)?.to ?? chartFilter.field
          r = r.filter(row => String(row?.[mappedField] ?? "") === chartFilter.value)
        }
        return r
      }
    }
    return allSlotsRows
  }

  for (const k of kpis) {
    const kind = (k.kind ?? "field") as any
    if (kind === "formula") continue
    const catField = (k as any).categoriaField as string | undefined
    const catValue = (k as any).categoriaValue as string | undefined

    const baseRows = kind === "field"
      ? getSlotRowsForField(k.fuente as string)
      : allSlotsRows

    const kpiRows: RowData[] = catField && catValue
      ? baseRows.filter((r) => String(r?.[catField] ?? "") === catValue)
      : baseRows

    if (kind === "expression") {
        const hasActiveFilter =
          (userFilters.condiciones ?? []).some((c) => c.campo && c.valor) ||
          !!userFilters.fechas?.inicio ||
          !!userFilters.fechas?.fin ||
          chartFilter !== null

        if (catField && catValue && kpiRows.length === 0 && hasActiveFilter) {
          byId[k.id] = 0
        } else {
          byId[k.id] = evaluateExpressionKpi(
            (k as any).expression ?? "",
            kpiRows,
            constMap,
            byId,
            kpis as KPIDefinition[]
          )
        }
      } else {
        byId[k.id] = computeBaseKpiValue(kpiRows, k)
      }
    }

    // pass 2: formulas (iterativo para dependencias)
    const formulas = kpis.filter((k) => (k.kind ?? "field") === "formula")
    const pending = new Set(formulas.map((k) => k.id))

    for (let pass = 0; pass < Math.max(2, formulas.length + 1); pass++) {
      let progressed = 0

      for (const k of formulas) {
        if (!pending.has(k.id)) continue
        const r = computeFormulaKpiValue(k, byId, constMap, kpis as KPIDefinition[])
        if (!r.ok) continue
        byId[k.id] = r.value
        pending.delete(k.id)
        progressed++
      }

      if (progressed === 0) break
    }

    // fallback
    for (const k of formulas) {
      if (!pending.has(k.id)) continue
      const f = k.formula
      if (!f) {
        byId[k.id] = 0
        continue
      }
      const A = resolveOperand(f.aKpiId, byId, constMap).value
      const B = resolveOperand(f.bKpiId, byId, constMap).value
      const op = f.op
      let v = 0
      if (op === "add") v = A + B
      else if (op === "sub") v = A - B
      else if (op === "mul") v = A * B
      else if (op === "div") v = B === 0 ? 0 : A / B
      else if (op === "pct") v = B === 0 ? 0 : (A / B) * 100
      byId[k.id] = v
      pending.delete(k.id)
    }

    return { kpiValues: byId, visibleKpis: visible }
  }, [config.kpis, filteredRows, constMap])

    const renderChart = (chart: ChartDefinition, rowHeight: number = 320, onSegmentClick?: (field: string, value: string) => void) => {
    const tipo = chart.tipo

    // ── KPIs como fuente de datos ──────────────────────────────────────────
    // Paleta extendida por gráfico
    const extraColors = (chart as any).extraColors as string[] | undefined
    const chartPalette = extraColors?.length ? [...palette, ...extraColors] : palette
    const kpiIds = (chart as any).kpiIds as string[] | undefined
    if (kpiIds && kpiIds.length > 0) {
      const kpiData = kpiIds.map((kpiId) => {
        const kpi = (config.kpis as ExtendedKPI[]).find((k) => k.id === kpiId)
        return { name: kpi?.nombre ?? kpiId, value: kpiValues[kpiId] ?? 0 }
      })
      if (tipo === "tabla") {
        return (
          <div style={{ maxHeight: `${rowHeight}px`, overflowY: "auto" }}>
            <SortableTable
              data={kpiData}
              rowHeight={(chart as any).tableRowHeight}
              columnLabels={{ name: "KPI", value: "Valor" }}
              columnWidths={(chart as any).columnWidths}
              showTotals={(chart as any).showTotals}
            />
          </div>
        )
      }
      // Para cualquier otro tipo: barras de KPIs
      return (
        <ResponsiveContainer width="100%" height={rowHeight}>
          <BarChart data={kpiData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              {kpiData.map((_, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }
    // ──────────────────────────────────────────────────────────────────────
    // Cada chart usa su slot declarado
    const chartSourceLabel = (chart as any).sourceLabel as string | undefined
    const globalFieldMap = ((config as any).slotFieldMap ?? []) as { from: string; to: string; slot: string }[]

    const chartRows = chartSourceLabel && dataBySlot[chartSourceLabel]
      ? (() => {
          const slotMap = globalFieldMap.filter(m => m.slot === chartSourceLabel)
          const translatedFilters: ReportFilters = slotMap.length > 0 ? {
            ...userFilters,
            condiciones: (userFilters.condiciones ?? []).map(cond => {
              const mapped = slotMap.find(m => m.from === cond.campo)
              return mapped ? { ...cond, campo: mapped.to } : cond
            })
          } : userFilters
          let r = applyFilters(dataBySlot[chartSourceLabel], translatedFilters)
          if (chartFilter) {
            const mappedField = slotMap.find(m => m.from === chartFilter.field)?.to ?? chartFilter.field
            r = r.filter(row => String(row?.[mappedField] ?? "") === chartFilter.value)
          }
          return r
        })()
      : filteredRows
    const built = buildSeries(chartRows, chart)
    const s = built.data
    const seriesKeys = built.seriesKeys

    if (tipo === "torta") {
      const key = seriesKeys[0]?.key ?? "value"
      const groupByField = chart.groupBy as string
      const pieData = s.map((p) => ({ name: p.name, value: Number(p[key] ?? 0) }))
      const isFiltered = chartFilter?.field === groupByField

      return (
        <div className="relative">
          {isFiltered && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span>Filtrado por: <strong>{chartFilter!.value}</strong></span>
              <button
                onClick={() => setChartFilter(null)}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                ✕ Quitar filtro
              </button>
            </div>
          )}
          <ResponsiveContainer width="100%" height={rowHeight}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                label
                cursor={onSegmentClick ? "pointer" : undefined}
                onClick={(entry: any) => {
                  if (!onSegmentClick || !groupByField) return
                  const val = String(entry?.name ?? "")
                  if (chartFilter?.field === groupByField && chartFilter?.value === val) {
                    setChartFilter(null)
                  } else {
                    onSegmentClick(groupByField, val)
                  }
                }}
              >
                {pieData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={palette[idx % palette.length]}
                    opacity={isFiltered && chartFilter?.value !== entry.name ? 0.35 : 1}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {onSegmentClick && !isFiltered && (
            <p className="text-center text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <MousePointerClick className="h-3 w-3" /> Haz click en un sector para filtrar
            </p>
          )}
        </div>
      )
    }
    if (tipo === "barras") {
      const anyRight = seriesKeys.some((k) => (k.axis ?? "left") === "right")
      const stackId = (chart.barMode ?? "grouped") === "stacked" ? "stack" : undefined
      const groupByField = chart.groupBy as string
      const isFiltered = chartFilter?.field === groupByField
      const slotSeries = (chart as any).slotSeries as {
        slot: string; groupBy: string; agg?: KPIOperation; label: string
      }[] | undefined
      
      // ── Modo multi-slot ──────────────────────────────────────────
      if (slotSeries && slotSeries.length > 0) {
        const globalFieldMap = ((config as any).slotFieldMap ?? []) as { from: string; to: string; slot: string }[]
        const allNames = new Set<string>()
        const seriesMaps = slotSeries.map(ss => {
          const fieldMap = globalFieldMap.filter(m => m.slot === ss.slot)
          const translatedFilters: ReportFilters = {
            ...userFilters,
            condiciones: (userFilters.condiciones ?? []).map(cond => {
              const mapped = fieldMap.find(m => m.from === cond.campo)
              return mapped ? { ...cond, campo: mapped.to } : cond
            })
          }
          let r = applyFilters(dataBySlot[ss.slot] ?? [], translatedFilters)
          if (chartFilter) {
            const mappedField = fieldMap.find(m => m.from === chartFilter.field)?.to ?? chartFilter.field
            r = r.filter(row => String(row?.[mappedField] ?? "") === chartFilter.value)
          }
          const grouped = groupRows(r, ss.groupBy)
          const valueMap = new Map<string, number>()
          for (const [name, rows] of grouped.entries()) {
            allNames.add(name)
            const aggField = (ss as any).field as string | undefined
            valueMap.set(name, aggField
              ? rows.reduce((acc, r) => acc + (Number(r[aggField]) || 0), 0)
              : rows.length)
          }
          return valueMap
        })

        const chartData = Array.from(allNames).map(name => {
          const point: any = { name }
          slotSeries.forEach((ss, idx) => { point[ss.label] = seriesMaps[idx].get(name) ?? 0 })
          return point
        })

        const isHorizontal = (chart as any).barOrientation === "horizontal"
        const stackId = (chart as any).barMode === "stacked" ? "stack" : undefined
        const ChartComponent = isHorizontal ? BarChart : BarChart
        
        return (
          <ResponsiveContainer width="100%" height={rowHeight}>
            <BarChart
              data={chartData}
              layout={isHorizontal ? "vertical" : "horizontal"}
            >
              <CartesianGrid strokeDasharray="3 3" />
              {isHorizontal ? (
                <>
                  <XAxis type="number" tickFormatter={(v) => `${v}`} />
                  <YAxis type="category" dataKey="name" width={80} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" />
                  <YAxis />
                </>
              )}
              <Tooltip />
              <Legend />
              {slotSeries.map((ss, idx) => (
                <Bar
                  key={ss.label}
                  dataKey={ss.label}
                  stackId={stackId}
                  fill={(ss as any).color || palette[idx % palette.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )
      }
      return (
        <div className="relative">
          {isFiltered && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <span>Filtrado por: <strong>{chartFilter!.value}</strong></span>
              <button
                onClick={() => setChartFilter(null)}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                ✕ Quitar filtro
              </button>
            </div>
          )}
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={s}
              onClick={(data: any) => {
                if (!onSegmentClick || !groupByField || !data?.activeLabel) return
                const val = String(data.activeLabel)
                if (chartFilter?.field === groupByField && chartFilter?.value === val) {
                  setChartFilter(null)
                } else {
                  onSegmentClick(groupByField, val)
                }
              }}
              style={{ cursor: onSegmentClick ? "pointer" : undefined }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" label={(chart as any).labelX ? { value: (chart as any).labelX, position: "insideBottom", offset: -5 } : undefined} />
              <YAxis yAxisId="left" label={(chart as any).labelY ? { value: (chart as any).labelY, angle: -90, position: "insideLeft" } : undefined} />
              {anyRight && <YAxis yAxisId="right" orientation="right" />}
              
              <Tooltip />
              {seriesKeys.length > 1 && <Legend />}
              {(seriesKeys.length ? seriesKeys : [{ key: "value", label: "value", axis: "left" }]).map((sk, idx) => (
                <Bar
                  key={sk.key}
                  dataKey={sk.key}
                  yAxisId={(sk.axis ?? "left") === "right" ? "right" : "left"}
                  stackId={stackId}
                  fill={palette[idx % palette.length]}
                  barSize={(chart as any).barSizeMin}
                  maxBarSize={(chart as any).barSizeMax}
                />
              ))}
              {(chart as any).referenceKpiId && kpiValues[(chart as any).referenceKpiId] != null && (
                <ReferenceLine
                  yAxisId="left"
                  y={kpiValues[(chart as any).referenceKpiId]}
                  stroke="#ef4444"
                  strokeDasharray="5 3"
                  strokeWidth={2}
                  label={{
                    value: `▶ ${kpiValues[(chart as any).referenceKpiId]?.toFixed(1)}`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#ef4444",
                  }}
                />
              )}
            </BarChart>

          </ResponsiveContainer>
          {onSegmentClick && !isFiltered && (
            <p className="text-center text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <MousePointerClick className="h-3 w-3" /> Haz click en una barra para filtrar
            </p>
          )}
        </div>
      )
    }

    if (tipo === "spline") {
      const anyRight = seriesKeys.some((k) => (k.axis ?? "left") === "right")
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={s}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" label={(chart as any).labelX ? { value: (chart as any).labelX, position: "insideBottom", offset: -5 } : undefined} />
            <YAxis yAxisId="left" label={(chart as any).labelY ? { value: (chart as any).labelY, angle: -90, position: "insideLeft" } : undefined} />
            {anyRight && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            {seriesKeys.length > 1 && <Legend />}
            {(seriesKeys.length ? seriesKeys : [{ key: "value", label: "value", axis: "left" }]).map((sk, idx) => (
              <Line
                key={sk.key}
                type="monotone"
                dataKey={sk.key}
                yAxisId={(sk.axis ?? "left") === "right" ? "right" : "left"}
                dot={false}
                stroke={palette[idx % palette.length]}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "area") {
      const anyRight = seriesKeys.some((k) => (k.axis ?? "left") === "right")
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={s}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" label={(chart as any).labelX ? { value: (chart as any).labelX, position: "insideBottom", offset: -5 } : undefined} />
              <YAxis yAxisId="left" label={(chart as any).labelY ? { value: (chart as any).labelY, angle: -90, position: "insideLeft" } : undefined} />
            {anyRight && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip />
            {seriesKeys.length > 1 && <Legend />}
            {(seriesKeys.length ? seriesKeys : [{ key: "value", label: "value", axis: "left" }]).map((sk, idx) => (
              <Area
                key={sk.key}
                type="monotone"
                dataKey={sk.key}
                yAxisId={(sk.axis ?? "left") === "right" ? "right" : "left"}
                stroke={palette[idx % palette.length]}
                fill={palette[idx % palette.length]}
                fillOpacity={0.2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "scatter" || tipo === "plot") {
      const xKey = chart.metric as string | undefined
      const yKey = chart.metric2 as string | undefined
      if (!xKey || !yKey) return <div className="text-sm text-muted-foreground">Scatter requiere metric y metric2.</div>

      const pts = chartRows
        .map((r) => ({ x: toNumber(r?.[xKey]), y: toNumber(r?.[yKey]) }))
        .filter((p) => p.x != null && p.y != null)
        .map((p) => ({ x: p.x!, y: p.y! }))

      return (
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" />
            <YAxis dataKey="y" type="number" />
            <Tooltip />
            <Scatter data={pts} fill={palette[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "combo") {
      const metrics = (chart.metrics ?? []) as ChartMetricDefinition[]
      if (metrics.length < 2) return <div className="text-sm text-muted-foreground">Combo requiere ≥ 2 métricas.</div>

      const built2 = buildSeries(chartRows, { ...chart, seriesBy: undefined })
      const s2 = built2.data
      const metricKeys: { key: string; dataKey: string; axis: "left" | "right"; render: "bar" | "line"; label: string }[] = metrics.map((m, idx) => ({
        key: `${m.field}__${m.agg}__${idx}`,
        dataKey: `${m.field}__${m.agg}`,
        axis: (m.axis ?? "left") as "left" | "right",
        render: (m.render ?? "bar") as "bar" | "line",
        label: `${m.field} (${m.agg})`,
      }))

      return (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={s2}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            {metricKeys.map((m, idx) => {
              const yAxisId = m.axis === "right" ? "right" : "left"
              if (m.render === "line") {
                return <Line key={m.key} yAxisId={yAxisId} type="monotone" dataKey={m.dataKey} dot={false} stroke={palette[idx % palette.length]} />
              }
              return <Bar key={m.key} yAxisId={yAxisId} dataKey={m.dataKey} fill={palette[idx % palette.length]} />
            })}
          </ComposedChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "funnel") {
      const key = seriesKeys[0]?.key ?? "value"
      const funnelData = s.map((p, idx) => ({
        name: p.name,
        value: Number(p[key] ?? 0),
        fill: palette[idx % palette.length],
      }))
      return (
        <ResponsiveContainer width="100%" height={rowHeight}>
          <FunnelChart>
            <Tooltip />
            <RechartsFunnel dataKey="value" data={funnelData} isAnimationActive>
              <LabelList position="right" fill="#555" stroke="none" dataKey="name" />
            </RechartsFunnel>
          </FunnelChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "tabla") {
    
  const slotJoin = (chart as any).slotJoin as {
    primarySlot: string
    primaryGroupBy: string
    groupByLabel?: string
    columns: { slot: string; groupByField: string; field?: string; agg: KPIOperation; label: string }[]
  } | undefined
  const displayMode = (chart as any).displayMode as string | undefined
  const columnLabelMap = (chart as any).columnLabelMap as Record<string, string> | undefined
  
  
  // ── Modo filas agrupadas (Tableau style) ─────────────────────────
      if (displayMode === "grouped_rows") {
        
        const groupDisplayField = (chart as any).groupDisplayField as string ?? chart.groupBy as string ?? ""
        const rawFields = (chart as any).rawFields as string[] ?? []
        const collapseToSum = !!(chart as any).collapseToSum
        const tableRows = collapseToSum
          ? (() => {
              // Detectar cuáles rawFields son texto (se usan como sub-agrupación)
              const textRawFields = rawFields.filter(f =>
                chartRows.some(r => r[f] != null && r[f] !== "" && isNaN(Number(r[f])))
              )
              const numericRawFields = rawFields.filter(f =>
                !textRawFields.includes(f) &&
                chartRows.some(r => !isNaN(Number(r[f])) && r[f] !== "" && r[f] != null)
              )

              // Agrupar por groupDisplayField + todos los campos de texto
              const groupKeys = [groupDisplayField, ...textRawFields]
              const aggregated = new Map<string, Record<string, any>>()

              for (const row of chartRows) {
                const key = groupKeys.map(k => String(row[k] ?? "")).join("||")
                if (!aggregated.has(key)) {
                  const r: Record<string, any> = {}
                  groupKeys.forEach(k => { r[k] = row[k] ?? "" })
                  numericRawFields.forEach(f => { r[f] = 0 })
                  aggregated.set(key, r)
                }
                const acc = aggregated.get(key)!
                numericRawFields.forEach(f => {
                  acc[f] = (acc[f] || 0) + (Number(row[f]) || 0)
                })
              }

              return Array.from(aggregated.values())
            })()
          : chartRows
        const groupedTotals = (chart as any).showTotals
          ? (() => {
              const sourceRows = tableRows
              const totals: Record<string, any> = {}
              const numericRawFields = rawFields.filter(f =>
                sourceRows.some(r => !isNaN(Number(r[f])) && r[f] !== "" && r[f] != null)
              )
              totals[groupDisplayField] = "Total"
              if ((chart as any).showSubtotals && numericRawFields.length > 0) {
                totals["__suma__"] = chartRows.reduce((acc, r) =>
                  acc + numericRawFields.reduce((s, f) => s + (Number(r[f]) || 0), 0), 0)
              }
              for (const f of rawFields) {
                if (numericRawFields.includes(f)) {
                  totals[f] = chartRows.reduce((acc, r) => acc + (Number(r[f]) || 0), 0)
                } else {
                  totals[f] = ""
                }
              }
              return totals
            })()
          : null
        // Construir datos para exportación (sin formato, con todos los campos)
        
        const exportData = chartRows.map(row => {
          const r: any = {}
          const allFields = [groupDisplayField, ...rawFields]
          allFields.forEach(f => { r[columnLabelMap?.[f] ?? f] = row[f] ?? "" })
          return r
        })
        return (
          <div style={{ height: `${rowHeight}px`, overflowY: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="flex justify-end mb-1 shrink-0">
              <button
                onClick={() => exportToExcel(exportData, {}, (chart as any).titulo ?? "tabla")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 hover:bg-muted/50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Excel
              </button>
            </div>
            <div className="overflow-auto flex-1">
              {collapseToSum ? (
                <SortableTable
                  data={tableRows}
                  columnLabels={columnLabelMap}
                  columnWidths={(chart as any).columnWidths}
                  rowHeight={(chart as any).tableRowHeight}
                  showSubtotals={(chart as any).showSubtotals}
                />
              ) : (
                <GroupedTable
                  data={tableRows}
                  groupByField={groupDisplayField}
                  displayFields={rawFields}
                  columnLabels={columnLabelMap}
                  columnWidths={(chart as any).columnWidths}
                  rowHeight={(chart as any).tableRowHeight}
                  showSubtotals={(chart as any).showSubtotals}
                />
              )}
            </div>
            {groupedTotals && (
              <div className="shrink-0 border-t-2 bg-muted/20 overflow-hidden" style={{ marginLeft: "-3px" }}>
                <table className="min-w-[520px] w-full text-sm border-collapse">
                  <colgroup>
                    {[groupDisplayField, ...((chart as any).showSubtotals ? ["__suma__", ...rawFields] : rawFields)].map((k) => (
                      <col key={k} style={{
                        width: (chart as any).columnWidths?.[k] ? `${(chart as any).columnWidths[k]}px` : undefined,
                        minWidth: (chart as any).columnWidths?.[k] ? `${(chart as any).columnWidths[k]}px` : undefined,
                      }} />
                    ))}
                  </colgroup>
                  <tbody>
                    <tr>
                      {[groupDisplayField, ...((chart as any).showSubtotals ? ["__suma__", ...rawFields] : rawFields)].map((k) => (
                        <td key={k} className="px-2 font-semibold"
                          style={{
                            paddingTop: (chart as any).tableRowHeight ?? 8,
                            paddingBottom: (chart as any).tableRowHeight ?? 8,
                            width: (chart as any).columnWidths?.[k] ? `${(chart as any).columnWidths[k]}px` : undefined,
                          }}>
                          {typeof groupedTotals[k] === "number"
                            ? groupedTotals[k].toLocaleString("es-CO")
                            : groupedTotals[k] ?? ""}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }
  // ── Modo JOIN multi-slot ──────────────────────────────────────────────
  if (slotJoin && slotJoin.primaryGroupBy && slotJoin.columns.length > 0) {
    // 1. Obtener valores únicos del campo de agrupación principal
    const primaryRows = (() => {
      let r = applyFilters(dataBySlot[slotJoin.primarySlot] ?? [], userFilters)
      if (chartFilter) r = r.filter(row => String(row?.[chartFilter.field] ?? "") === chartFilter.value)
      return r
    })()
    const groupValues = Array.from(new Set(primaryRows.map(r => {
      const v = r?.[slotJoin.primaryGroupBy]
      return v == null || String(v).trim() === "" ? "(vacío)" : String(v)
    })))

    // 2. Para cada columna, agrupar su slot por groupByField y calcular métrica
    const fieldMap: { from: string; to: string }[] = (slotJoin as any).fieldMap ?? []

    const colMaps: Map<string, number>[] = slotJoin.columns.map(col => {
      const slotRows = (() => {
        const translatedFilters: ReportFilters = {
          ...userFilters,
          condiciones: (userFilters.condiciones ?? []).map(cond => {
            const mapped = fieldMap.find(m => m.from === cond.campo)
            return mapped ? { ...cond, campo: mapped.to } : cond
          })
        }
        let r = applyFilters(dataBySlot[col.slot] ?? [], translatedFilters)
        if (chartFilter) {
          const mappedChartField = fieldMap.find(m => m.from === chartFilter.field)?.to ?? chartFilter.field
          r = r.filter(row => String(row?.[mappedChartField] ?? "") === chartFilter.value)
        }
        return r
      })()
      const grouped = new Map<string, number[]>()
      for (const row of slotRows) {
        const key = row?.[col.groupByField]
        const k = key == null || String(key).trim() === "" ? "(vacío)" : String(key)
        if (!grouped.has(k)) grouped.set(k, [])
        if (col.field) {
          const n = toNumber(row?.[col.field])
          if (n != null) grouped.get(k)!.push(n)
        } else {
          grouped.get(k)!.push(1)
        }
      }
      const valueMap = new Map<string, number>()
      for (const [k, nums] of grouped.entries()) {
        valueMap.set(k, aggregateNumeric(nums, col.agg ?? "count"))
      }
      return valueMap
    })

    // 3. Construir tabla joined
    const tableData = groupValues.map(name => {
      const row: Record<string, any> = { [slotJoin.groupByLabel ?? slotJoin.primaryGroupBy]: name }
      slotJoin.columns.forEach((col, idx) => {
        row[col.label] = colMaps[idx].get(name) ?? 0
      })
      return row
    })

    return (
      <div style={{ maxHeight: `${rowHeight}px`, overflowY: "auto" }}>
        <SortableTable
          data={tableData}
          rowHeight={(chart as any).tableRowHeight}
          columnWidths={(chart as any).columnWidths}
        />
      </div>
    )
  }

  // ── Modo normal ───────────────────────────────────────────────────────
  const tableLabels: Record<string, string> = {}
  const groupByField = chart.groupBy as string | undefined
  if (groupByField) tableLabels["name"] = columnLabelMap?.["name"] ?? columnLabelMap?.[groupByField] ?? groupByField

  const mt = chart.measureType ?? "count"
  if (mt === "count") {
    const cf = (chart.countField ?? "__rows__") as string
    const autoLabel = cf === "__rows__" ? "conteo" : cf
    tableLabels["value"] = columnLabelMap?.["value"] ?? columnLabelMap?.[autoLabel] ?? autoLabel
  } else {
    const metrics = (chart.metrics ?? []) as ChartMetricDefinition[]
    if (metrics.length > 0) {
      for (const m of metrics) {
        const k = `${m.field}__${m.agg}`
        tableLabels[k] = columnLabelMap?.[k] ?? `${m.field} (${m.agg})`
      }
    } else if (chart.metric) {
      tableLabels["value"] = columnLabelMap?.["value"] ?? `${chart.metric} (${chart.agg ?? "sum"})`
    }
  }
  if (s.length > 0) {
    for (const k of Object.keys(s[0])) {
      if (!tableLabels[k] && columnLabelMap?.[k]) {
        tableLabels[k] = columnLabelMap[k]
      }
    }
  }
  return (
     <div style={{ height: `${rowHeight}px`, overflowY: "hidden", display: "flex", flexDirection: "column" }}>
      <div className="flex justify-end mb-1 shrink-0">
        <button
          onClick={() => exportToExcel(s, tableLabels, (chart as any).titulo ?? "tabla")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2 py-1 hover:bg-muted/50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Excel
        </button>
      </div>
      <SortableTable
        data={s}
        rowHeight={(chart as any).tableRowHeight}
        columnLabels={tableLabels}
        columnWidths={(chart as any).columnWidths}
        showTotals={(chart as any).showTotals}
        showSubtotals={(chart as any).showSubtotals}
      />
    </div>
  )
}
      if (tipo === "highlights") {
      const items: string[] = ((chart as any).highlightItems ?? []).filter(Boolean)

      return (
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: `${rowHeight}px` }}>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin comentarios configurados</p>
          ) : (
            items.map((text, idx) => (
              <div
                key={idx}
                className="flex gap-3 items-start p-3 rounded-lg border"
                style={{ backgroundColor: branding?.chartBackgroundColor || "#ffffff" }}
              >
                <div
                  className="shrink-0 mt-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: palette[idx % palette.length] }}
                />
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            ))
          )}
        </div>
      )
    }
    return <div className="text-sm text-muted-foreground">Tipo "{tipo}" aún no implementado.</div>
  }

  // Hero text color (default to white)
  const heroTextColor = branding.heroTextColor || "#ffffff"

  // Detectar campos que contienen fotos
  // Prioridad 1: Usar configuración manual del builder
  // Prioridad 2: Auto-detección por nombre de campo y contenido
  const photoFields = useMemo(() => {
    // Si galleryPhotoFields existe (aunque sea vacío), respetar la configuración manual
    if (branding.galleryPhotoFields !== undefined) {
      return branding.galleryPhotoFields.filter(Boolean)
    }

    // Si no, auto-detectar
    const fields: string[] = []
    const sampleSize = Math.min(10, rows.length)
    
    availableFields.forEach(field => {
      const fieldLower = field.toLowerCase()
      // Buscar campos que contengan palabras clave
      if (fieldLower.includes('foto') || 
          fieldLower.includes('image') || 
          fieldLower.includes('evidencia') ||
          fieldLower.includes('picture')) {
        fields.push(field)
        return
      }

      // Revisar muestra de datos para URLs
      const hasUrls = rows.slice(0, sampleSize).some(row => {
        const value = String(row[field] || '')
        return value.includes('drive.google.com') || 
               value.includes('http://') || 
               value.includes('https://')
      })
      
      if (hasUrls) {
        fields.push(field)
      }
    })
    
    return fields
  }, [rows, availableFields, branding.galleryPhotoFields])

  const hasPhotos = photoFields.length > 0
  const allPhotos = useMemo(() => {
      if (!hasPhotos) return []
      
      const photos: Array<{ url: string; field: string; rowData: RowData; index: number }> = []
      
      allSlotsRows.forEach((row, rowIndex) => {
        photoFields.forEach(field => {
          const value = row[field]
          if (!value) return

          let urls: string[] = []
          
          if (typeof value === 'object' && value !== null) {
            const urlStr = value.hyperlink || value.text
            if (urlStr) {
              urls = String(urlStr).split(',').map(u => u.trim()).filter(Boolean)
            }
          } else {
            urls = String(value).split(',').map(u => u.trim()).filter(Boolean)
          }
          
          urls.forEach(url => {
            let imageUrl = url
            
            if (url.includes('drive.google.com')) {
              const idMatch = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/?]+)/)
              if (idMatch) {
                const fileId = idMatch[1]
                const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
                imageUrl = `/api/proxy-image?url=${encodeURIComponent(driveUrl)}`
              }
            }
            
            photos.push({
              url: imageUrl,
              field,
              rowData: row,
              index: rowIndex,
            })
          })
        })
      })
      
      return photos
    }, [filteredRows, photoFields, hasPhotos])

  return (
    <div className="space-y-6">
      <div ref={printRef}> 
      {/* Hero */}
      {(heroImagePublicUrl || branding.heroTitle || branding.heroSubtitle) && (
        <div 
          className="relative overflow-hidden rounded-xl border bg-white" 
          style={{ height: `${branding.heroImageHeight || 160}px` }}
        >
          {heroImagePublicUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImagePublicUrl} alt="hero" className="absolute inset-0 h-full w-full object-cover" />
             <div className="absolute inset-0 bg-black" style={{ opacity: branding.heroOverlayOpacity ?? 0.35 }} />
            </>
          )}
          <div className="relative p-6 flex flex-col justify-end h-full">
            <div style={{ color: heroTextColor }}>
              <div className="text-lg font-semibold">{branding.heroTitle ?? config.campaignNombre}</div>
              <div className="text-sm opacity-90">{branding.heroSubtitle ?? config.empresaNombre}</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart filter indicator */}
      {chartFilter && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <MousePointerClick className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200">
            Filtro activo desde gráfica: <strong>{chartFilter.field}</strong> = <strong>{chartFilter.value}</strong>
          </span>
          <button
            onClick={() => setChartFilter(null)}
            className="ml-auto text-amber-600 hover:text-amber-800 font-medium"
          >
            ✕ Quitar
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6">
      <FilterPanel
        filters={userFilters}
        onFiltersChange={setUserFilters}
        availableFields={availableFields}
        campaignId={campaignId}
        rows={allSlotsRowsUnfiltered}
        cardBackground={branding.filterBackgroundColor}
        cardBorderRadius={branding.filterBorderRadius}
        textColor={branding.filterTextColor}
        iconColor={branding.filterIconColor}
        defaultFilterCols={(config as any).defaultFilterCols ?? 3}
      />
      </div>
      {/* KPI cards con grid de 12 columnas */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(48, minmax(0, 1fr))" }}>
                {visibleKpis.map((kpi) => {
          const v = kpiValues[kpi.id] ?? 0
          const columnas = (kpi as ExtendedKPI).columnas || 3
          return (
            <KpiCard 
              key={kpi.id} 
              title={kpi.nombre} 
              value={formatKpiValue(v, kpi)} 
              columnas={columnas}
              branding={branding}
            />
          )
        })}
      </div>

      {/* Tabs: Gráficos vs Evidencias */}
      <Tabs defaultValue="graficos" className="w-full mt-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="graficos">
            <BarChart3 className="h-4 w-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="evidencias" disabled={!hasPhotos}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Evidencias {hasPhotos && allPhotos.length > 0 && `(${allPhotos.length})`} 
          </TabsTrigger>
        </TabsList>

        {/* Tab: Gráficos */}
        <TabsContent value="graficos" className="mt-6">
          <div className="space-y-4">
            {(config.filas ?? []).map((row: DashboardRow) => (
              <div key={row.id} className="grid grid-cols-12 gap-4">
                {[...(row.graficos ?? [])].sort((a, b) => ((a as any).orden ?? 999) - ((b as any).orden ?? 999)).map((chart) => (
                  <div
                      key={chart.id}
                      className="border p-4 min-w-0"
                      style={{ 
                        gridColumn: `span ${chart.columnas} / span ${chart.columnas}`,
                        backgroundColor: branding?.chartBackgroundColor || "#ffffff",
                        borderRadius: `${branding?.chartBorderRadius ?? 8}px`,
                      } as any}
                    >
                    <div className="mb-2 text-sm font-medium">{chart.titulo}</div>
                    {renderChart(chart, (row as any).altura ?? 320, (["barras", "torta"].includes(chart.tipo as string)) ? (field, value) => setChartFilter({ field, value }) : undefined)}
                  </div>
                ))}
              </div>
            ))}
            
            {/* Separator before Evidencias */}
            {/* {hasPhotos && (
              <div className="pt-8 border-t">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  💡 También puedes ver las evidencias fotográficas en la pestaña "Evidencias"
                </p>
              </div>
            )} */}
          </div>
        </TabsContent>

        {/* Tab: Evidencias fotográficas */}
        <TabsContent value="evidencias" className="mt-6">
          {hasPhotos ? (
            <EvidenceGallery 
              rows={allSlotsRows} 
              photoFields={photoFields}
              metadataFields={branding.galleryMetadataFields}
              metadataFieldLabels={branding.galleryMetadataFieldLabels}
              imageHeight={branding.galleryImageHeight}
              backgroundColor={branding.galleryBackgroundColor ?? "#f8fafc"}
              imageBackground={(branding as any).galleryImageBackground ?? "#000000"}
              metadataBackground={(branding as any).galleryMetadataBackground ?? "#f1f5f9"}
              metadataCols={(branding as any).galleryMetadataCols ?? 2}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se detectaron campos con fotos.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Stats badge at bottom */}
      <div className="mt-8 pt-6 border-t flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredRows.length} de {rows.length} registros
        </p>
        <Button variant="outline" onClick={handleExportPdf} disabled={isExporting} className="gap-2">
          <FileDown className="h-4 w-4" />
          {isExporting ? "Exportando..." : "Exportar PDF"}
        </Button>
      </div>

      </div> {/* ← cierre printRef */}
    </div>
  )
}