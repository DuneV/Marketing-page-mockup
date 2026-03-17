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
} from "recharts"

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
  columnas?: number // NEW: tamaño del KPI (1-12)
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

function resolveOperand(raw: string, valuesById: KPIValueMap, constMap: Record<string, number>): { ok: boolean; value: number } {
  const r = parseOperandRef(raw)
  if (r.kind === "num") return { ok: true, value: Number.isFinite(r.value) ? r.value : 0 }
  if (r.kind === "const") return { ok: true, value: Number(constMap[r.key] ?? 0) }
  if (r.kind === "kpi") {
    const has = Object.prototype.hasOwnProperty.call(valuesById, r.id)
    return { ok: has, value: Number(valuesById[r.id] ?? 0) }
  }
  return { ok: false, value: 0 }
}

function computeFormulaKpiValue(kpi: KPIDefinition, valuesById: KPIValueMap, constMap: Record<string, number>): { ok: boolean; value: number } {
  const f = kpi.formula
  if (!f?.aKpiId || !f?.bKpiId || !f?.op) return { ok: false, value: 0 }

  const A = resolveOperand(f.aKpiId, valuesById, constMap)
  const B = resolveOperand(f.bKpiId, valuesById, constMap)

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
        gridColumn: `span ${columnas} / span ${columnas}`,
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
  imageHeight = 500,
  backgroundColor = "#f8fafc",
  imageBackground = "#000000",
  metadataBackground = "#f1f5f9",
  metadataCols = 2,
}: {
  rows: RowData[]
  photoFields: string[]
  metadataFields?: string[] // Campos específicos a mostrar como metadata
  imageHeight?: number // Altura del contenedor de imagen en px
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
                  <span className="font-medium">{key}:</span> {String(currentPhoto.rowData[key] || 'N/A')}
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
}) {
  const [tempFilters, setTempFilters] = useState<ReportFilters>(filters)
  const [filterOptions, setFilterOptions] = useState<Record<string, any[]>>({})
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({})

  const loadFieldOptions = async (fieldName: string) => {
    if (!campaignId || filterOptions[fieldName] || loadingOptions[fieldName]) return
    
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
          const value = row[fieldName]
          if (value !== null && value !== undefined && value !== '') {
            // Manejar valores que pueden ser objetos o strings
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
    setTempFilters({
      ...tempFilters,
      condiciones: [
        ...(tempFilters.condiciones || []),
        { campo: "", operador: "eq", valor: "", columnas: 4 },
      ],
    })
  }

  const removeCondition = (index: number) => {
    const newConditions = [...(tempFilters.condiciones || [])]
    newConditions.splice(index, 1)
    setTempFilters({
      ...tempFilters,
      condiciones: newConditions,
    })
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
            disabled={!hasActiveFilters}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fecha Inicio */}
        <div className="border p-4 shadow-sm" style={{ backgroundColor: cardBackground || "var(--card)", borderRadius: `${cardBorderRadius ?? 8}px`, color: textColor || "inherit" }}>
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
        </div>

        {/* Fecha Fin */}
        <div className="border p-4 shadow-sm" style={{ backgroundColor: cardBackground || "var(--card)", borderRadius: `${cardBorderRadius ?? 8}px`, color: textColor || "inherit" }}>
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
        </div>

        {/* Dynamic Condition Filters */}
        {tempFilters.condiciones?.map((condition, index) => {
          const fieldOptions = filterOptions[condition.campo] || []
          const isLoadingFieldOptions = loadingOptions[condition.campo]
          
          return (
            <div key={index} className="border p-4 shadow-sm relative" style={{ backgroundColor: cardBackground || "var(--card)", borderRadius: `${cardBorderRadius ?? 8}px`, color: textColor || "inherit" }}>
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
                <Select
                  value={condition.campo}
                  onValueChange={(value) => updateTempCondition(index, "campo", value)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {condition.campo && fieldOptions.length > 0 ? (
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
// -----------------------------
// Sortable Table Component
// -----------------------------
function SortableTable({ data }: { data: any[] }) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const columns = Object.keys(data?.[0] ?? {})

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const an = Number(av)
      const bn = Number(bv)
      const isNum = !isNaN(an) && !isNaN(bn)
      let cmp = 0
      if (isNum) {
        cmp = an - bn
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), "es", { sensitivity: "base" })
      }
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

  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sin datos.</p>

  return (
    <div className="overflow-auto">
      <table className="min-w-[520px] w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((k) => {
              const isActive = sortKey === k
              const isNum = !isNaN(Number(data[0]?.[k]))
              return (
                <th
                  key={k}
                  className="text-left p-2 font-medium cursor-pointer select-none hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort(k)}
                >
                  <div className="flex items-center gap-1">
                    <span>{k}</span>
                    <span className="text-xs text-muted-foreground">
                      {isActive
                        ? sortDir === "asc"
                          ? isNum ? "↑" : "A→Z"
                          : isNum ? "↓" : "Z→A"
                        : "↕"}
                    </span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
              {columns.map((k) => (
                <td key={k} className="p-2">
                  {String(row[k] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
  // Efecto para cargar URL pública si es gsUri
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

  const rows = useMemo<RowData[]>(() => {
    if (Array.isArray(data)) return data as RowData[]
    if (!data) return []

    const d = data as any

    if (Array.isArray(d.rows)) return d.rows as RowData[]
    if (Array.isArray(d.data)) return d.data as RowData[]
    if (Array.isArray(d.items)) return d.items as RowData[]

    console.warn("[DashboardFromConfig] data no es array:", data)
    return []
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
    if (rows.length === 0) return []
    return Object.keys(rows[0]).sort()
  }, [rows])

  const constMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of constants) {
      if (!c?.key) continue
      const kind = c.kind ?? "static"
      if (kind === "static") {
        m[c.key] = Number(c.value ?? 0)
      } else if (kind === "filtered_agg" && c.field) {
        // Aplicar filtro de fila si existe
        const subset = c.filterField && c.filterValue
          ? filteredRows.filter((r) => String(r?.[c.filterField!] ?? "") === c.filterValue)
          : filteredRows
        const nums = subset.map((r) => toNumber(r?.[c.field!])).filter((n): n is number => n !== null)
        m[c.key] = aggregateNumeric(nums, c.agg ?? "sum")
      }
    }
    return m
  }, [constants, filteredRows])

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

  // KPIs computation with filtered data
  const { kpiValues, visibleKpis } = useMemo(() => {
    const kpis = (config.kpis ?? []) as ExtendedKPI[]
    const visible = kpis.filter((k) => k.visible !== false)
    const byId: KPIValueMap = {}

    // pass 1: field
    for (const k of kpis) {
      const kind = (k.kind ?? "field") as any
      if (kind === "formula") continue
      byId[k.id] = computeBaseKpiValue(filteredRows, k)
    }

    // pass 2: formulas (iterativo para dependencias)
    const formulas = kpis.filter((k) => (k.kind ?? "field") === "formula")
    const pending = new Set(formulas.map((k) => k.id))

    for (let pass = 0; pass < Math.max(2, formulas.length + 1); pass++) {
      let progressed = 0

      for (const k of formulas) {
        if (!pending.has(k.id)) continue
        const r = computeFormulaKpiValue(k, byId, constMap)
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

  const renderChart = (chart: ChartDefinition, onSegmentClick?: (field: string, value: string) => void) => {
    const tipo = chart.tipo
    const built = buildSeries(filteredRows, chart)
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
          <ResponsiveContainer width="100%" height={320}>
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
              <Legend />
              {(seriesKeys.length ? seriesKeys : [{ key: "value", label: "value", axis: "left" }]).map((sk, idx) => (
                <Bar
                  key={sk.key}
                  dataKey={sk.key}
                  yAxisId={(sk.axis ?? "left") === "right" ? "right" : "left"}
                  stackId={stackId}
                  fill={palette[idx % palette.length]}
                />
              ))}
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
            <Legend />
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
            <Legend />
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

      const pts = filteredRows
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

      const built2 = buildSeries(filteredRows, { ...chart, seriesBy: undefined })
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

    if (tipo === "tabla") {
      return <SortableTable data={s} />
    }

    return <div className="text-sm text-muted-foreground">Tipo "{tipo}" aún no implementado.</div>
  }

  // Hero text color (default to white)
  const heroTextColor = branding.heroTextColor || "#ffffff"

  // Detectar campos que contienen fotos
  // Prioridad 1: Usar configuración manual del builder
  // Prioridad 2: Auto-detección por nombre de campo y contenido
  const photoFields = useMemo(() => {
    // Si hay configuración manual, usarla
    if (branding.galleryPhotoFields && branding.galleryPhotoFields.length > 0) {
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
      
      filteredRows.forEach((row, rowIndex) => {
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
      <FilterPanel
        filters={userFilters}
        onFiltersChange={setUserFilters}
        availableFields={availableFields}
        campaignId={campaignId}
        rows={filteredRows}
        cardBackground={branding.filterBackgroundColor}
        cardBorderRadius={branding.filterBorderRadius}
        textColor={branding.filterTextColor}
        iconColor={branding.filterIconColor}
      />

      {/* KPI cards con grid de 12 columnas */}
      <div className="grid grid-cols-12 gap-4">
                {visibleKpis.map((kpi) => {
          const v = kpiValues[kpi.id] ?? 0
          const columnas = (kpi as ExtendedKPI).columnas || 3
          return (
            <KpiCard 
              key={kpi.id} 
              title={kpi.nombre} 
              value={formatKpiValue(v, kpi)} 
              columnas={columnas}
              branding={branding}  // ← AGREGAR
            />
          )
        })}
      </div>

      {/* Tabs: Gráficos vs Evidencias */}
      <Tabs defaultValue="graficos" className="w-full">
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
                {(row.graficos ?? []).map((chart) => (
                  <div
                      key={chart.id}
                      className="col-span-12 border p-4"
                      style={{ 
                        gridColumn: `span ${chart.columnas} / span ${chart.columnas}`,
                        backgroundColor: branding?.chartBackgroundColor || "#ffffff",
                        borderRadius: `${branding?.chartBorderRadius ?? 8}px`,
                      } as any}
                    >
                    <div className="mb-2 text-sm font-medium">{chart.titulo}</div>
                    {renderChart(chart, (["barras", "torta"].includes(chart.tipo as string)) ? (field, value) => setChartFilter({ field, value }) : undefined)}
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
              rows={filteredRows} 
              photoFields={photoFields}
              metadataFields={branding.galleryMetadataFields}
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
      <div className="mt-8 pt-6 border-t text-center">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredRows.length} de {rows.length} registros
        </p>
      </div>
    </div>
  )
}