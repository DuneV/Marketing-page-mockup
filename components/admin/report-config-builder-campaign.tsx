"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getAvailableFields,
  getCampaignReportConfig,
  saveCampaignReportConfig,
  type AvailableField,
  type AvailableFilter,
} from "@/lib/api/campaignApi"
import { getAssetReadUrl } from "@/lib/api/campaignApi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

import {
  LayoutDashboard,
  Plus,
  Trash2,
  AlertCircle,
  GripVertical,
  Save,
  Palette,
  Download,
  FileText,
  Image as ImageIcon,
  Hash,
} from "lucide-react"

import { reportConfigStorage } from "@/lib/report-config-storage"
import { DATA_SOURCE_LABELS, CHART_TYPE_LABELS, KPI_OPERATION_LABELS } from "@/lib/report-config-labels"

import type { Campaign } from "@/types/campaign"
import type {
  ReportConfiguration,
  DashboardRow,
  ChartDefinition,
  KPIDefinition,
  ChartType,
  DataSource,
  KPIOperation,
  ReportTemplate,
  BootstrapCol,
  KPIFormat,
  KPIFormulaOp,
  MeasureType,
  ChartMetricDefinition,
  MetricAxis,
  MetricRender,
} from "@/types/report-config"

// -----------------------------
// Helper: Convert gs:// to public URL
// -----------------------------
function gsUriToHttpUrl(gsUri: string, previewCache?: string): string {
  // 1. Si hay cache, usarlo (para preview en el builder)
  if (previewCache) return previewCache
  
  // 2. Resto igual
  if (!gsUri) return ""
  if (gsUri.startsWith("http")) return gsUri
  if (gsUri.startsWith("gs://")) {
    return `https://storage.googleapis.com/${gsUri.replace("gs://", "")}`
  }
  return gsUri
}

// -----------------------------
// Props
// -----------------------------
interface ReportConfigBuilderCampaignProps {
  campaign: Campaign
  onSaved?: () => void
}

// -----------------------------
// Límites
// -----------------------------
const DEFAULT_LIMITS = {
  maxKPIs: 20,
  maxFilas: 10,
  maxGraficosPorFila: 4,
}

// -----------------------------
// Extensiones internas
// -----------------------------
type KPIKind = "field" | "formula" | "expression"
type AnyChart = ChartDefinition & {
  fuente?: string
  metric?: string
  metric2?: string
  agg?: KPIOperation
  measureType?: MeasureType
  countField?: string | "__rows__"
  metrics?: ChartMetricDefinition[]
  barOrientation?: "vertical" | "horizontal"
  barMode?: "grouped" | "stacked"
  barSizeMin?: number
  barSizeMax?: number
  referenceKpiId?: string
  sourceLabel?: string
  tableRowHeight?: number
  kpiIds?: string[]
  columnWidths?: Record<string, number>
  extraColors?: string[]
}

type ExtendedKPI = Omit<KPIDefinition, "kind"> & {
  kind?: KPIKind
  visible?: boolean
  formato?: KPIFormat
  unidad?: string
  decimales?: number
  columnas?: number
  formula?: {
    aKpiId: string
    op: KPIFormulaOp
    bKpiId: string
  }
  expression?: string
  categoriaField?: string
  categoriaValue?: string
  escala?: number
}

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
  heroTextColor?: string
  heroImageHeight?: number
  heroOverlayOpacity?: number
  galleryPhotoFields?: string[]
  galleryMetadataFields?: string[]
  galleryImageHeight?: number
  
  // NUEVO: Estilos de KPI
  kpiBackgroundColor?: string
  kpiTextColor?: string
  kpiBorderRadius?: number
  _previewCache?: {
    heroImageBase64?: string
  }
  // NUEVO: Estilos de gráficos
  chartBackgroundColor?: string
  galleryBackgroundColor?: string
  galleryMetadataBackground?: string
  galleryImageBackground?: string
  galleryMetadataCols?: number
  galleryMetadataFieldLabels?: Record<string, string>
  chartBorderRadius?: number
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
  columnas?: number
}

// -----------------------------
// Tipos de chart disponibles (incluye combo)
// -----------------------------
const ALL_CHART_TYPES: ChartType[] = [
  "torta",
  "barras",
  "spline",
  "plot",
  "scatter",
  "area",
  "radar",
  "funnel",
  "gauge",
  "heatmap",
  "treemap",
  "tabla",
  "combo",
]

// -----------------------------
// Helpers
// -----------------------------
function safeLabel(fieldName: string) {
  return (DATA_SOURCE_LABELS as Record<string, string> | undefined)?.[fieldName] || fieldName
}

function validateChart(chart: AnyChart) {
  const t = chart.tipo as string
  const needsGroup = ["barras", "spline", "area", "radar", "heatmap", "treemap", "funnel", "tabla", "torta", "combo"].includes(t)

  if (needsGroup) {
    if (!chart.groupBy) return "Este gráfico necesita un Group By (eje X)."
  }

  if (t === "scatter") {
    if (chart.measureType !== "numeric") return "Scatter requiere métrica numérica (activa 'Usar métrica numérica')."
    if (!chart.metric || !chart.metric2) return "Scatter necesita 2 métricas (X y Y)."
  }

  if (t === "combo") {
    if (chart.measureType !== "numeric") return "Combo requiere métrica numérica."
    const ms = chart.metrics ?? []
    if (ms.length < 2) return "Combo requiere al menos 2 métricas (ej: barras + línea)."
    for (const m of ms) {
      if (!m?.field) return "Hay una métrica sin campo seleccionado."
      if (!m?.agg) return "Hay una métrica sin operación (agg)."
      if (!m?.axis) return "Hay una métrica sin eje (left/right)."
      if (!m?.render) return "En Combo, cada métrica debe ser Bar o Line."
    }
  }

  const needsMetric = ["barras", "torta", "tabla", "spline", "area", "radar", "heatmap", "treemap", "funnel", "combo"].includes(t)
  if (needsMetric) {
    const mt: MeasureType = chart.measureType ?? "count"
    if (mt === "count") {
      if (!chart.countField) return "Selecciona qué campo quieres contar (o Filas)."
    } else {
      if (Array.isArray(chart.metrics) && chart.metrics.length > 0) {
        for (const m of chart.metrics) {
          if (!m?.field) return "Hay una métrica sin campo seleccionado."
          if (!m?.agg) return "Hay una métrica sin operación (agg)."
          if (!m?.axis) return "Hay una métrica sin eje (left/right)."
        }
      } else {
        if (!chart.metric) return "Selecciona un campo numérico (métrica Y)."
        if (!chart.agg) return "Selecciona una operación (sum/mean/etc)."
      }
    }
  }

  return null
}

function parseOperandRef(raw: string) {
  const s = String(raw ?? "").trim()
  if (!s) return { kind: "empty" as const }

  if (s.startsWith("kpi:")) return { kind: "kpi" as const, id: s.slice(4) }
  if (s.startsWith("const:")) return { kind: "const" as const, key: s.slice(6) }
  if (s.startsWith("num:")) return { kind: "num" as const, value: Number(s.slice(4)) }

  return { kind: "kpi" as const, id: s }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

// -----------------------------
// Main component
// -----------------------------
export function ReportConfigBuilderCampaign({ campaign, onSaved }: ReportConfigBuilderCampaignProps) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<Omit<ReportConfiguration, "id" | "fechaCreacion" | "fechaActualizacion"> | null>(null)
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [heroImagePublicUrl, setHeroImagePublicUrl] = useState<string | null>(null)
  const [heroImageLoading, setHeroImageLoading] = useState(false)
  const [heroImageError, setHeroImageError] = useState<string | null>(null)
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([])
  const [availableFilters, setAvailableFilters] = useState<AvailableFilter[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [lastImportId, setLastImportId] = useState<string | null>(null)
  const [kpiFieldOptions, setKpiFieldOptions] = useState<Record<string, string[]>>({})
  const [kpiFieldOptionsLoading, setKpiFieldOptionsLoading] = useState<Record<string, boolean>>({})

  const loadKpiFieldOptions = async (fieldName: string) => {
    if (!fieldName || kpiFieldOptionsLoading[fieldName]) return
    if (kpiFieldOptions[fieldName] && kpiFieldOptions[fieldName].length > 0) return

    setKpiFieldOptionsLoading((prev) => ({ ...prev, [fieldName]: true }))
    try {
      const { getFilterOptions, getCampaignDataset } = await import("@/lib/api/campaignApi")

      // Paso 1: intentar el mismo endpoint que usa FilterPanel
      const response = await getFilterOptions(campaign.id, [fieldName])
      let fieldData: any[] =
        response?.options?.[fieldName] ||
        response?.filters?.[fieldName] ||
        response?.[fieldName] ||
        []

      let values: string[] = []

      if (Array.isArray(fieldData) && fieldData.length > 0) {
        values = fieldData
          .map((item: any) =>
            typeof item === "object" && item !== null
              ? String(item.value ?? item.label ?? Object.values(item)[0] ?? "")
              : String(item)
          )
          .filter(Boolean)
      }

      // Paso 2 (mismo fallback que FilterPanel): extraer valores únicos de los datos reales
      if (values.length === 0) {
        try {
          const rawData = await getCampaignDataset(campaign.id)
          const rows: Record<string, any>[] = Array.isArray(rawData) ? rawData : []

          const uniqueValues = new Set<string>()
          rows.forEach((row) => {
            const value = row[fieldName]
            if (value !== null && value !== undefined && value !== "") {
              const strValue =
                typeof value === "object" ? String(value?.text ?? value?.value ?? JSON.stringify(value)) : String(value)
              if (strValue.trim()) uniqueValues.add(strValue.trim())
            }
          })
          values = Array.from(uniqueValues).sort()
        } catch (fallbackErr) {
          console.warn("[Builder] Fallback getCampaignData falló:", fallbackErr)
        }
      }

      setKpiFieldOptions((prev) => ({ ...prev, [fieldName]: values }))
    } catch (e) {
      console.error("[Builder] Error cargando opciones de campo:", e)
      setKpiFieldOptions((prev) => ({ ...prev, [fieldName]: [] }))
    } finally {
      setKpiFieldOptionsLoading((prev) => ({ ...prev, [fieldName]: false }))
    }
  }

  const constants = useMemo<DashboardConstant[]>(() => (((config as any)?.constantes ?? []) as DashboardConstant[]) || [], [config])
  const branding = useMemo<BrandingConfig>(() => (((config as any)?.branding ?? {}) as BrandingConfig) || {}, [config])

  const [imageStatus, setImageStatus] = useState<string>("")

  // -----------------------------
  // Defaults
  // -----------------------------
  const makeDefaultConfig = (): Omit<ReportConfiguration, "id" | "fechaCreacion" | "fechaActualizacion"> => ({
    campaignId: campaign.id,
    campaignNombre: campaign.nombre,
    empresaId: campaign.empresaId,
    empresaNombre: campaign.empresaNombre,
    filtros: {
      campanas: [campaign.id],
      fechas: {
        inicio: campaign.fechaInicio,
        fin: campaign.fechaFin,
      },
      condiciones: [],
    },
    paletaColores: {
      primario: "#000000",
      secundario: "#ffffff",
      acento: "#FFB000",
    },
    kpis: [],
    filas: [],
    activa: true,
  })

  // -----------------------------
  // Load fields
  // -----------------------------
  const loadAvailableFields = async (signal?: AbortSignal) => {
    if (!campaign?.id) return
    setIsLoadingFields(true)
    try {
      const { fields, filters, importId } = await getAvailableFields(campaign.id)
      if (signal?.aborted) return
      // Deduplicar por name+sourceLabel para evitar keys duplicadas en el render
      const seen = new Set<string>()
      const dedupedFields = (fields ?? []).filter((f) => {
        const key = `${f.name}__${(f as any).sourceLabel ?? "primary"}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setAvailableFields(dedupedFields)
      setAvailableFilters(filters ?? [])
      setLastImportId(importId ?? null)
    } catch (error) {
      if (signal?.aborted) return
      console.error("Error loading available fields:", error)
      setAvailableFields([])
      setAvailableFilters([])
      setLastImportId(null)
    } finally {
      if (!signal?.aborted) setIsLoadingFields(false)
    }
  }

  const textFields = useMemo(() => {
    const seen = new Set<string>()
    return availableFields
      .filter((f) => f.type === "text" || f.type === "date" || f.type === "boolean" || f.type === "unknown")
      .filter((f) => { if (seen.has(f.name)) return false; seen.add(f.name); return true })
  }, [availableFields])
  const numericFields = useMemo(() => {
    const seen = new Set<string>()
    return availableFields
      .filter((f) => f.type === "number")
      .filter((f) => { if (seen.has(f.name)) return false; seen.add(f.name); return true })
  }, [availableFields])
  const allFieldNames = useMemo(() => Array.from(new Set(availableFields.map((f) => f.name))), [availableFields])
  // Campos únicos por nombre para dropdowns globales (sin contexto de slot)
  const uniqueFields = useMemo(() => {
    const seen = new Set<string>()
    return availableFields.filter((f) => {
      if (seen.has(f.name)) return false
      seen.add(f.name)
      return true
    })
  }, [availableFields])

  const getValidOperationsForType = (type: AvailableField["type"]): KPIOperation[] => {
    if (type === "number") return ["sum", "mean", "min", "max", "count", "median", "std", "variance"]
    return ["count"]
  }

  const getNumericAggOps = (): KPIOperation[] => getValidOperationsForType("number")

  // -----------------------------
  // Load config from API + templates
  // -----------------------------
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()

    ;(async () => {
      try {
        reportConfigStorage.initialize()
        setTemplates(reportConfigStorage.getAllTemplates())

        const remote = await getCampaignReportConfig(campaign.id)
        const exists = (remote as any)?.exists
        const remoteConfig = (remote as any)?.config

        if (controller.signal.aborted) return

        if (exists && remoteConfig) {
          setConfig(remoteConfig)
        } else {
          setConfig(makeDefaultConfig())
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("Error loading remote config:", error)
        setConfig(makeDefaultConfig())
      } finally {
        loadAvailableFields(controller.signal)
      }
    })()

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign.id])
  
  useEffect(() => {
    const heroImageUrl = branding.heroImageUrl
    
    // Reset
    setHeroImagePublicUrl(null)
    setHeroImageError(null)
    
    if (!heroImageUrl) {
      return
    }

    // Si es base64 (del cache temporal), usar directamente
    if (heroImageUrl.startsWith("data:")) {
      setHeroImagePublicUrl(heroImageUrl)
      return
    }

    // Si es URL http/https normal, usar directamente
    if (heroImageUrl.startsWith("http://") || heroImageUrl.startsWith("https://")) {
      setHeroImagePublicUrl(heroImageUrl)
      return
    }

    // Si es gs:// URI, convertir a URL firmada
    if (heroImageUrl.startsWith("gs://")) {
      setHeroImageLoading(true)
      
      ;(async () => {
        try {
          console.log("[Builder] Loading signed URL for:", heroImageUrl)
          const signedUrl = await getAssetReadUrl(heroImageUrl, 120) // 2 horas
          console.log("[Builder] Signed URL loaded successfully")
          setHeroImagePublicUrl(signedUrl)
        } catch (error: any) {
          console.error("[Builder] Error loading signed URL:", error)
          setHeroImageError(error?.message ?? "Error cargando imagen")
        } finally {
          setHeroImageLoading(false)
        }
      })()
    }
  }, [branding.heroImageUrl])

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    setConfig((prev) => {
      if (!prev) return null
      return {
        ...prev,
        ...template.configuracion,
        campaignId: campaign.id,
        campaignNombre: campaign.nombre,
        empresaId: campaign.empresaId,
        empresaNombre: campaign.empresaNombre,
        filtros: {
          ...template.configuracion.filtros,
          campanas: [campaign.id],
          fechas: {
            inicio: campaign.fechaInicio,
            fin: campaign.fechaFin,
          },
          condiciones: (template.configuracion as any)?.filtros?.condiciones ?? prev.filtros?.condiciones ?? [],
        },
      }
    })
  }

  // -----------------------------
  // Constantes CRUD
  // -----------------------------
  const setConstants = (next: DashboardConstant[]) => {
    if (!config) return
    setConfig({ ...(config as any), constantes: next } as any)
  }

  const addConstant = () => {
    const base = "const"
    let i = 1
    const used = new Set(constants.map((c) => c.key))
    while (used.has(`${base}_${i}`)) i++
    setConstants([...constants, { key: `${base}_${i}`, value: 0, label: "" }])
  }

  const updateConstant = (key: string, patch: Partial<DashboardConstant>) => {
    setConstants(constants.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }

  const deleteConstant = (key: string) => {
    setConstants(constants.filter((c) => c.key !== key))
  }

  // -----------------------------
  // Branding / Imagen (dataURL o URL)
  // -----------------------------
  const setBranding = (next: BrandingConfig) => {
    if (!config) return
    setConfig({ ...(config as any), branding: next } as any)
  }

  const handleImageFile = async (file: File) => {
  try {
    setImageStatus("Subiendo imagen a GCS...")
    
    // 1. Convertir a base64 PRIMERO (preview inmediato)
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ""))
      reader.onerror = () => reject(reader.error ?? new Error("file_read_error"))
      reader.readAsDataURL(file)
    })
    
    // 2. Subir a GCS
    const companyId = campaign.empresaId
    const campaignId = campaign.id
    
    if (!companyId) {
      setImageStatus("❌ Error: No se encontró companyId")
      return
    }

    const { uploadAsset } = await import("@/lib/api/campaignApi")
    const { gcsUri } = await uploadAsset({ companyId, campaignId, file })
    
    // 3. Guardar AMBOS
    setBranding({ 
      ...branding, 
      heroImageUrl: gcsUri,
      _previewCache: { heroImageBase64: base64 }
    })
    
    setImageStatus("✅ Imagen subida a GCS.")
    setTimeout(() => setImageStatus(""), 2000)
  } catch (e: any) {
    console.error("Error uploading image:", e)
    setImageStatus(`❌ Error: ${e?.message ?? "No se pudo subir la imagen"}`)
  }
}

  // -----------------------------
  // KPI CRUD
  // -----------------------------
  const addKPI = () => {
    if (!config) return
    if (config.kpis.length >= DEFAULT_LIMITS.maxKPIs) {
      alert(`Límite de KPIs alcanzado (${DEFAULT_LIMITS.maxKPIs})`)
      return
    }

    const firstField = availableFields[0]
    const newKPI: ExtendedKPI = {
      id: crypto.randomUUID(),
      nombre: "Nuevo KPI",
      kind: "field",
      operacion: firstField?.type === "number" ? ("sum" as KPIOperation) : ("count" as KPIOperation),
      fuente: ((firstField?.name as DataSource) ?? ("unknown" as DataSource)) as DataSource,
      countField: "__rows__",
      visible: true,
      formato: firstField?.type === "number" ? "number" : "number",
      decimales: 0,
      unidad: "",
      columnas: 3,
    }

    setConfig({ ...config, kpis: [...config.kpis, newKPI as any] })
  }

  const updateKPI = (id: string, updates: Partial<ExtendedKPI>) => {
    if (!config) return
    setConfig({
      ...config,
      kpis: (config.kpis as ExtendedKPI[]).map((kpi) => (kpi.id === id ? ({ ...kpi, ...updates } as any) : (kpi as any))),
    })
  }

  const deleteKPI = (id: string) => {
    if (!config) return
    setConfig({
      ...config,
      kpis: config.kpis.filter((kpi) => kpi.id !== id),
    })
  }

  // -----------------------------
  // Rows / Charts CRUD
  // -----------------------------
  const addRow = () => {
    if (!config) return
    if (config.filas.length >= DEFAULT_LIMITS.maxFilas) {
      alert(`Límite de filas alcanzado (${DEFAULT_LIMITS.maxFilas})`)
      return
    }

    const newRow = {
      id: crypto.randomUUID(),
      orden: config.filas.length + 1,
      graficos: [],
      altura: 320,
    } as DashboardRow & { altura: number }

    setConfig({ ...config, filas: [...config.filas, newRow] })
  }

  const deleteRow = (id: string) => {
    if (!config) return
    const filtered = config.filas.filter((row) => row.id !== id)
    const reordered = filtered.map((row, index) => ({ ...row, orden: index + 1 }))
    setConfig({ ...config, filas: reordered })
  }

  const updateChart = (rowId: string, chartId: string, updates: Partial<AnyChart>) => {
    if (!config) return
    setConfig({
      ...config,
      filas: config.filas.map((row) =>
        row.id === rowId
          ? {
              ...row,
              graficos: row.graficos.map((chart) => (chart.id === chartId ? ({ ...(chart as any), ...updates } as any) : chart)),
            }
          : row
      ),
    })
  }

  const deleteChart = (rowId: string, chartId: string) => {
    if (!config) return
    setConfig({
      ...config,
      filas: config.filas.map((row) => (row.id === rowId ? { ...row, graficos: row.graficos.filter((c) => c.id !== chartId) } : row)),
    })
  }

  const addMetricToChart = (rowId: string, chartId: string) => {
    if (!config) return
    const first = numericFields[0]?.name
    if (!first) return

    const chart = config.filas.find((r) => r.id === rowId)?.graficos.find((c) => c.id === chartId) as AnyChart | undefined
    const current = (chart?.metrics ?? []) as ChartMetricDefinition[]
    const isCombo = (chart?.tipo as string) === "combo"

    const next: ChartMetricDefinition[] = [
      ...current,
      {
        field: first as any,
        agg: ((current?.[0]?.agg ?? chart?.agg ?? "sum") as KPIOperation) || "sum",
        axis: "left",
        render: isCombo ? (current.length === 0 ? "bar" : "line") : undefined,
      },
    ]

    updateChart(rowId, chartId, { measureType: "numeric", metrics: next } as any)
  }

  const updateMetric = (rowId: string, chartId: string, idx: number, patch: Partial<ChartMetricDefinition>) => {
    if (!config) return
    const chart = config.filas.find((r) => r.id === rowId)?.graficos.find((c) => c.id === chartId) as AnyChart | undefined
    const current = (chart?.metrics ?? []) as ChartMetricDefinition[]
    const next = current.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    updateChart(rowId, chartId, { metrics: next } as any)
  }

  const deleteMetric = (rowId: string, chartId: string, idx: number) => {
    if (!config) return
    const chart = config.filas.find((r) => r.id === rowId)?.graficos.find((c) => c.id === chartId) as AnyChart | undefined
    const current = (chart?.metrics ?? []) as ChartMetricDefinition[]
    const next = current.filter((_, i) => i !== idx)
    updateChart(rowId, chartId, { metrics: next } as any)
  }

  const addChartToRow = (rowId: string) => {
    if (!config) return
    const row = config.filas.find((r) => r.id === rowId)
    if (!row) return

    if (row.graficos.length >= DEFAULT_LIMITS.maxGraficosPorFila) {
      alert(`Límite de gráficos por fila alcanzado (${DEFAULT_LIMITS.maxGraficosPorFila})`)
      return
    }

    const defaultGroupBy = (textFields[0]?.name ?? availableFields[0]?.name ?? "") as any

    const newChart: AnyChart = {
      id: crypto.randomUUID(),
      tipo: "barras",
      titulo: "Nuevo Gráfico",
      fuente: ((availableFields[0]?.name as DataSource) ?? ("unknown" as DataSource)) as DataSource,
      columnas: 6 as BootstrapCol,
      groupBy: defaultGroupBy || undefined,
      labelField: defaultGroupBy || undefined,
      measureType: "count",
      countField: "__rows__",
      agg: "sum",
      metric: numericFields[0]?.name,
      metrics: [],
      barOrientation: "vertical",
      barMode: "grouped",
    }

    setConfig({
      ...config,
      filas: config.filas.map((r) => (r.id === rowId ? { ...r, graficos: [...r.graficos, newChart as any] } : r)),
    })
  }

  // -----------------------------
  // Save
  // -----------------------------
  const handleSave = async () => {
    if (!config) return
    setIsLoading(true)

    try {
      const localErrors: string[] = []

      for (const fila of config.filas ?? []) {
        for (const ch of fila.graficos ?? []) {
          const err = validateChart(ch as AnyChart)
          if (err) localErrors.push(`Fila ${fila.orden} / "${(ch as any).titulo ?? "Gráfico"}": ${err}`)
        }
      }

      const kpis = (config.kpis as ExtendedKPI[]) ?? []
      const kpiIds = new Set(kpis.map((k) => k.id))

      for (const k of kpis) {
        const kind: KPIKind = (k.kind ?? "field") as KPIKind
        if (kind === "expression") {
          if (!k.expression?.trim()) {
            localErrors.push(`KPI "${k.nombre}": la expresión no puede estar vacía.`)
          }
          continue
        }
        if (kind === "formula") {
          const a = k.formula?.aKpiId
          const b = k.formula?.bKpiId
          const op = k.formula?.op
          if (!a || !b || !op) {
            localErrors.push(`KPI "${k.nombre}": falta seleccionar A, operación o B.`)
            continue
          }

          const ar = parseOperandRef(a)
          const br = parseOperandRef(b)
          if (ar.kind === "kpi" && ar.id && !kpiIds.has(ar.id)) localErrors.push(`KPI "${k.nombre}": KPI A no existe.`)
          if (br.kind === "kpi" && br.id && !kpiIds.has(br.id)) localErrors.push(`KPI "${k.nombre}": KPI B no existe.`)

          const constKeys = new Set(constants.map((c) => c.key))
          if (ar.kind === "const" && ar.key && !constKeys.has(ar.key)) localErrors.push(`KPI "${k.nombre}": Constante A no existe.`)
          if (br.kind === "const" && br.key && !constKeys.has(br.key)) localErrors.push(`KPI "${k.nombre}": Constante B no existe.`)
        }
      }

      if (localErrors.length) {
        setValidationErrors(localErrors)
        return
      }

      const fullToSave: any = {
      ...config,
      id: crypto.randomUUID(),
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    }
    if ((fullToSave as any).branding?._previewCache) {
      const { _previewCache, ...cleanBranding } = (fullToSave as any).branding
      fullToSave.branding = cleanBranding
    }

      const configForValidation: ReportConfiguration = {
        id: fullToSave.id,
        campaignId: fullToSave.campaignId,
        campaignNombre: fullToSave.campaignNombre,
        empresaId: fullToSave.empresaId,
        empresaNombre: fullToSave.empresaNombre,
        filtros: fullToSave.filtros,
        kpis: fullToSave.kpis,
        filas: fullToSave.filas,
        activa: fullToSave.activa,
        paletaColores: fullToSave.paletaColores,
        fechaCreacion: fullToSave.fechaCreacion,
        fechaActualizacion: fullToSave.fechaActualizacion,
      }

      const validation = reportConfigStorage.validateConfiguration(configForValidation, campaign.empresaId)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        return
      }

      await saveCampaignReportConfig(campaign.id, fullToSave as any)

      setValidationErrors([])
      setOpen(false)
      onSaved?.()
    } catch (error) {
      console.error("Error guardando configuración:", error)
      setValidationErrors(["Error al guardar la configuración"])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadJSON = () => {
    if (!config) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `reporte_config_${campaign.nombre.replace(/\s+/g, "_").toLowerCase()}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  // -----------------------------
  // Render helpers
  // -----------------------------
  const kpisTyped = useMemo(() => {
    return ((config?.kpis as ExtendedKPI[]) ?? [])
  }, [config?.kpis])

  const operandOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = []

    for (const k of kpisTyped) {
      const fmt = k.formato ?? "number"
      const fmtTag = fmt === "percent" ? " [%→÷100?]" : fmt === "currency" ? " [$]" : ""
      opts.push({ value: `kpi:${k.id}`, label: `KPI · ${k.nombre}${fmtTag}` })
    }

    for (const c of constants) {
      opts.push({ value: `const:${c.key}`, label: `Const · ${c.label || c.key}` })
    }

    opts.push({ value: "num:", label: "Número fijo…" })

    return opts
  }, [kpisTyped, constants])

  if (!config) {
    return (
      <TooltipProvider>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Cargando...</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Configurar Reporte</TooltipContent>
        </Tooltip>

        <DialogContent className="max-w-[90vw] sm:max-w-4xl lg:max-w-5xl max-h-[85vh] flex flex-col p-0">
          <div className="px-6 pt-6 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle>Configurar Reporte - {campaign.nombre}</DialogTitle>
              <DialogDescription>KPIs, constantes, branding, gráficos y colores</DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 px-6 overflow-y-auto">
            <div className="space-y-6 py-4">
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Branding / Decoración */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Decoración del Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hero Image Section */}
                  <div className="border-b pb-4">
                    <Label className="text-sm font-medium mb-3 block">Hero / Imagen Principal</Label>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                      <div className="lg:col-span-5 space-y-3">
                        <div>
                          <Label className="text-xs">Título (opcional)</Label>
                          <Input
                            className="h-8"
                            value={branding.heroTitle ?? ""}
                            onChange={(e) => setBranding({ ...branding, heroTitle: e.target.value })}
                            placeholder="Ej: Reporte Ejecutivo"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Subtítulo (opcional)</Label>
                          <Input
                            className="h-8"
                            value={branding.heroSubtitle ?? ""}
                            onChange={(e) => setBranding({ ...branding, heroSubtitle: e.target.value })}
                            placeholder="Ej: Club Colombia · Febrero"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Color de texto</Label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                              <input
                                type="color"
                                value={branding.heroTextColor ?? "#ffffff"}
                                onChange={(e) => setBranding({ ...branding, heroTextColor: e.target.value })}
                                className="h-full w-full p-0 border-0 cursor-pointer"
                              />
                            </div>
                            <Input
                              value={branding.heroTextColor ?? "#ffffff"}
                              onChange={(e) => setBranding({ ...branding, heroTextColor: e.target.value })}
                              className="h-8 font-mono text-xs"
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Opacidad del overlay oscuro (0-100)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            className="h-8"
                            value={Math.round((branding.heroOverlayOpacity ?? 0.35) * 100)}
                            onChange={(e) => setBranding({ ...branding, heroOverlayOpacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 })}
                            placeholder="35"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            0 = sin overlay, 35 = default, 100 = negro total
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Altura de imagen (px)</Label>
                          <Input
                            type="number"
                            min={100}
                            max={400}
                            step={20}
                            className="h-8"
                            value={branding.heroImageHeight ?? 160}
                            onChange={(e) => setBranding({ ...branding, heroImageHeight: parseInt(e.target.value) || 160 })}
                            placeholder="160"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Altura del hero decorativo (100-400px)
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Imagen por URL (opcional)</Label>
                          <Input
                            className="h-8"
                            value={branding.heroImageUrl ?? ""}
                            onChange={(e) => setBranding({ ...branding, heroImageUrl: e.target.value })}
                            placeholder="https://... o gs://..."
                          />
                        </div>
                        
                        <div>
                        <Label className="text-xs">O subir archivo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          className="h-9 cursor-pointer"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleImageFile(f)
                          }}
                        />
                        {imageStatus && <p className="text-xs text-muted-foreground mt-1">{imageStatus}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Se guardará como gs:// URL
                        </p>
                      </div>
                      </div>

                      <div className="lg:col-span-7">
                        <Label className="text-xs">Preview</Label>
                        <div 
                          className="mt-2 rounded-lg border overflow-hidden relative bg-muted"
                          style={{ height: `${branding.heroImageHeight || 160}px` }}
                        >
                          {/* CASO 1: Cache base64 (upload reciente) */}
                          {branding._previewCache?.heroImageBase64 ? (
                            <>
                              <img 
                                src={branding._previewCache.heroImageBase64}
                                alt="hero" 
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black" style={{ opacity: branding.heroOverlayOpacity ?? 0.35 }} />
                            </>
                          ) 

                          : (branding.heroImageUrl?.startsWith('http://') || branding.heroImageUrl?.startsWith('https://')) ? (
                            <>
                              <img 
                                src={branding.heroImageUrl}
                                alt="hero" 
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-950/20">
                                        <div class="text-center p-4">
                                          <p class="text-xs text-red-600 dark:text-red-400">Error al cargar imagen</p>
                                          <p class="text-[11px] text-muted-foreground">Verifica que la URL sea válida</p>
                                        </div>
                                      </div>
                                    `
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black" style={{ opacity: branding.heroOverlayOpacity ?? 0.35 }} />
                            </>
                          ) 
                          
                          : branding.heroImageUrl?.startsWith('gs://') ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted">
                              <div className="text-center p-4 max-w-md">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Imagen guardada en GCS
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono break-all px-4 bg-background/50 rounded p-2">
                                  {branding.heroImageUrl}
                                </p>
                                <p className="text-xs text-muted-foreground mt-3">
                                  Sube una nueva o pega URL https:// para preview
                                </p>
                              </div>
                            </div>
                          ) 
                          
                          :(
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                              Sin imagen
                            </div>
                          )}
                          
                          {/* Overlay de texto (SOLO UNA VEZ, solo si hay imagen visible) */}
                          {(branding._previewCache?.heroImageBase64 || 
                            branding.heroImageUrl?.startsWith('http://') || 
                            branding.heroImageUrl?.startsWith('https://')) && (
                            <div 
                              className="absolute inset-0 p-4 flex flex-col justify-end pointer-events-none" 
                              style={{ color: branding.heroTextColor || "#ffffff" }}
                            >
                              <div className="text-sm font-semibold">
                                {branding.heroTitle || "Título del Dashboard"}
                              </div>
                              <div className="text-xs opacity-90">
                                {branding.heroSubtitle || "Subtítulo / contexto"}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NUEVO: Estilos de KPI */}
                  <div className="border-b pb-4">
                    <Label className="text-sm font-medium mb-3 block">Estilos de KPIs</Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Color de fondo</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={branding.kpiBackgroundColor ?? "#ffffff"}
                              onChange={(e) => setBranding({ ...branding, kpiBackgroundColor: e.target.value })}
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={branding.kpiBackgroundColor ?? "#ffffff"}
                            onChange={(e) => setBranding({ ...branding, kpiBackgroundColor: e.target.value })}
                            className="h-8 font-mono text-xs"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Color de texto</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={branding.kpiTextColor ?? "#000000"}
                              onChange={(e) => setBranding({ ...branding, kpiTextColor: e.target.value })}
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={branding.kpiTextColor ?? "#000000"}
                            onChange={(e) => setBranding({ ...branding, kpiTextColor: e.target.value })}
                            className="h-8 font-mono text-xs"
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Redondeo (Border Radius)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={2}
                          className="h-8"
                          value={branding.filterBorderRadius ?? 8}
                          onChange={(e) => setBranding({ ...branding, filterBorderRadius: parseInt(e.target.value) || 8 })}
                          placeholder="8"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">0 = cuadrado, 8 = redondeado</p>
                      </div>

                      <div>
                        <Label className="text-xs">Color de texto</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={branding.filterTextColor ?? "#000000"}
                              onChange={(e) => setBranding({ ...branding, filterTextColor: e.target.value })}
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={branding.filterTextColor ?? "#000000"}
                            onChange={(e) => setBranding({ ...branding, filterTextColor: e.target.value })}
                            className="h-8 font-mono text-xs"
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Color de iconos</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={branding.filterIconColor ?? "#6b7280"}
                              onChange={(e) => setBranding({ ...branding, filterIconColor: e.target.value })}
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={branding.filterIconColor ?? "#6b7280"}
                            onChange={(e) => setBranding({ ...branding, filterIconColor: e.target.value })}
                            className="h-8 font-mono text-xs"
                            placeholder="#6b7280"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-xs">Color del label (título del KPI)</Label>
                      <div className="flex items-center gap-2 max-w-xs">
                        <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                          <input
                            type="color"
                            value={branding.kpiLabelColor ?? "#6b7280"}
                            onChange={(e) => setBranding({ ...branding, kpiLabelColor: e.target.value })}
                            className="h-full w-full p-0 border-0 cursor-pointer"
                          />
                        </div>
                        <Input
                          value={branding.kpiLabelColor ?? "#6b7280"}
                          onChange={(e) => setBranding({ ...branding, kpiLabelColor: e.target.value })}
                          className="h-8 font-mono text-xs"
                          placeholder="#6b7280"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Color del texto pequeño encima del valor</p>
                    </div>

                    {/* Preview KPI */}
                    <div className="mt-3">
                      <Label className="text-xs mb-2 block">Preview KPI</Label>
                      <div 
                        className="p-4 border"
                        style={{
                          backgroundColor: branding.kpiBackgroundColor || "#ffffff",
                          color: branding.kpiTextColor || "#000000",
                          borderRadius: `${branding.kpiBorderRadius ?? 8}px`,
                        }}
                      >
                        <div className="text-xs" style={{ color: branding.kpiLabelColor ?? "#6b7280" }}>Total Ventas</div>
                        <div className="text-2xl font-bold">$1,234,567</div>
                      </div>
                    </div>
                  </div>

                  {/* NUEVO: Estilos de Gráficos */}
                  <div className="border-b pb-4">
                    <Label className="text-sm font-medium mb-3 block">Estilos de Gráficos</Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Color de fondo</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={branding.chartBackgroundColor ?? "#ffffff"}
                              onChange={(e) => setBranding({ ...branding, chartBackgroundColor: e.target.value })}
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={branding.chartBackgroundColor ?? "#ffffff"}
                            onChange={(e) => setBranding({ ...branding, chartBackgroundColor: e.target.value })}
                            className="h-8 font-mono text-xs"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Redondeo (Border Radius)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={2}
                          className="h-8"
                          value={branding.chartBorderRadius ?? 8}
                          onChange={(e) => setBranding({ ...branding, chartBorderRadius: parseInt(e.target.value) || 8 })}
                          placeholder="8"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          0 = cuadrado, 8 = redondeado
                        </p>
                      </div>
                    </div>

                    {/* Preview Chart */}
                    <div className="mt-3">
                      <Label className="text-xs mb-2 block">Preview Gráfico</Label>
                      <div 
                        className="p-4 border"
                        style={{
                          backgroundColor: branding.chartBackgroundColor || "#ffffff",
                          borderRadius: `${branding.chartBorderRadius ?? 8}px`,
                        }}
                      >
                        <div className="text-sm font-medium mb-2">Ventas por Mes</div>
                        <div className="h-32 bg-muted/30 rounded flex items-center justify-center text-xs text-muted-foreground">
                          [Gráfico aquí]
                        </div>
                      </div>
                    </div>
                  </div>

                   {/* Estilos de Filtros */}
                  <div className="border-b pb-4">
                    <Label className="text-sm font-medium mb-3 block">Estilos de Filtros</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Color de fondo</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={branding.filterBackgroundColor ?? "#ffffff"}
                              onChange={(e) => setBranding({ ...branding, filterBackgroundColor: e.target.value })}
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={branding.filterBackgroundColor ?? "#ffffff"}
                            onChange={(e) => setBranding({ ...branding, filterBackgroundColor: e.target.value })}
                            className="h-8 font-mono text-xs"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Redondeo (Border Radius)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={2}
                          className="h-8"
                          value={branding.filterBorderRadius ?? 8}
                          onChange={(e) => setBranding({ ...branding, filterBorderRadius: parseInt(e.target.value) || 8 })}
                          placeholder="8"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">0 = cuadrado, 8 = redondeado</p>
                      </div>
                    </div>
                  </div>

                  {/* Galería de Evidencias */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Galería de Evidencias Fotográficas</Label>
                    
                    {/* Color de fondo de galería */}
                    <div className="mb-4 pb-4 border-b">
                      <Label className="text-xs font-medium mb-2 block">Colores de galería</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Fondo de la card</Label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                              <input
                                type="color"
                                value={branding.galleryBackgroundColor ?? "#f8fafc"}
                                onChange={(e) => setBranding({ ...branding, galleryBackgroundColor: e.target.value })}
                                className="h-full w-full p-0 border-0 cursor-pointer"
                              />
                            </div>
                            <Input
                              value={branding.galleryBackgroundColor ?? "#f8fafc"}
                              onChange={(e) => setBranding({ ...branding, galleryBackgroundColor: e.target.value })}
                              className="h-8 font-mono text-xs"
                              placeholder="#f8fafc"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">Card y controles de navegación</p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Fondo lateral de imagen</Label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                              <input
                                type="color"
                                value={(branding as any).galleryImageBackground ?? "#000000"}
                                onChange={(e) => setBranding({ ...branding, galleryImageBackground: e.target.value } as any)}
                                className="h-full w-full p-0 border-0 cursor-pointer"
                              />
                            </div>
                            <Input
                              value={(branding as any).galleryImageBackground ?? "#000000"}
                              onChange={(e) => setBranding({ ...branding, galleryImageBackground: e.target.value } as any)}
                              className="h-8 font-mono text-xs"
                              placeholder="#000000"
                            />
                          </div>
                           <p className="text-[11px] text-muted-foreground mt-1">Área a los lados cuando la imagen no llena el espacio</p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Fondo de metadata</Label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                              <input
                                type="color"
                                value={branding.galleryMetadataBackground ?? "#f1f5f9"}
                                onChange={(e) => setBranding({ ...branding, galleryMetadataBackground: e.target.value })}
                                className="h-full w-full p-0 border-0 cursor-pointer"
                              />
                            </div>
                            <Input
                              value={branding.galleryMetadataBackground ?? "#f1f5f9"}
                              onChange={(e) => setBranding({ ...branding, galleryMetadataBackground: e.target.value })}
                              className="h-8 font-mono text-xs"
                              placeholder="#f1f5f9"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">Sección de datos debajo de la imagen</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {/* Campos con fotos */}
                      <div>
                        <Label className="text-xs">Campos que contienen fotos (URLs)</Label>
                        <div className="space-y-2 mt-1">
                          {(branding.galleryPhotoFields ?? []).map((field, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Select
                                value={field}
                                onValueChange={(value) => {
                                  const next = [...(branding.galleryPhotoFields ?? [])]
                                  next[idx] = value
                                  setBranding({ ...branding, galleryPhotoFields: next })
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar campo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {uniqueFields.map((f) => (
                                    <SelectItem key={f.name} value={f.name}>
                                      {f.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const next = [...(branding.galleryPhotoFields ?? [])].filter((_, i) => i !== idx)
                                  setBranding({ ...branding, galleryPhotoFields: next })
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const next = [...(branding.galleryPhotoFields ?? []), ""]
                              setBranding({ ...branding, galleryPhotoFields: next })
                            }}
                            disabled={availableFields.length === 0}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar campo de foto
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Campos que contienen URLs de fotos (Google Drive, etc.)
                        </p>
                      </div>

                      {/* Campos de metadata */}
                      <div>
                        <Label className="text-xs">Campos a mostrar como información (metadata)</Label>
                        <div className="space-y-2 mt-1">
                          {(branding.galleryMetadataFields ?? []).map((field, idx) => (
                            <div key={idx} className="flex gap-2 items-center flex-wrap">
                              <Select
                                value={field}
                                onValueChange={(value) => {
                                  const next = [...(branding.galleryMetadataFields ?? [])]
                                  next[idx] = value
                                  setBranding({ ...branding, galleryMetadataFields: next })
                                }}
                              >
                                <SelectTrigger className="h-8 min-w-[160px]">
                                  <SelectValue placeholder="Seleccionar campo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {uniqueFields.map((f) => (
                                    <SelectItem key={f.name} value={f.name}>
                                      {f.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                className="h-8 max-w-[160px] text-xs"
                                placeholder="Etiqueta (opcional)"
                                value={(branding.galleryMetadataFieldLabels ?? {})[field] ?? ""}
                                onChange={(e) => {
                                  const labels = { ...(branding.galleryMetadataFieldLabels ?? {}) }
                                  if (e.target.value) {
                                    labels[field] = e.target.value
                                  } else {
                                    delete labels[field]
                                  }
                                  setBranding({ ...branding, galleryMetadataFieldLabels: labels })
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const next = [...(branding.galleryMetadataFields ?? [])].filter((_, i) => i !== idx)
                                  setBranding({ ...branding, galleryMetadataFields: next })
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const next = [...(branding.galleryMetadataFields ?? []), ""]
                              setBranding({ ...branding, galleryMetadataFields: next })
                            }}
                            disabled={availableFields.length === 0}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar campo de metadata
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Información que se mostrará junto a cada foto (ej: ciudad, fecha, vendedor)
                        </p>
                      
                      {/* Columnas del grid de metadata */}
                      <div className="mt-3">
                        <Label className="text-xs">Columnas en metadata (1-4)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={4}
                          className="h-8 max-w-[120px] mt-1"
                          value={(branding as any).galleryMetadataCols ?? 2}
                          onChange={(e) => setBranding({ ...branding, galleryMetadataCols: parseInt(e.target.value) || 2 } as any)}
                          placeholder="2"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Cuántas columnas usar para mostrar los campos de metadata
                        </p>
                      </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Constantes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Constantes
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={addConstant}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar constante
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {constants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay constantes. Úsalas para fórmulas tipo KPI / Const o KPI * Const.</p>
                  ) : (
                    constants.map((c) => {
                      const kind = c.kind ?? "static"
                      return (
                        <div key={c.key} className="border rounded p-3 space-y-2">
                          {/* Fila 1: key, label, tipo, eliminar */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                            <div className="md:col-span-3">
                              <Label className="text-xs">Key</Label>
                              <Input
                                className="h-8 font-mono"
                                value={c.key}
                                onChange={(e) => {
                                  const nextKey = e.target.value.trim()
                                  if (!nextKey) return
                                  if (constants.some((x) => x.key === nextKey && x.key !== c.key)) return
                                  setConstants(constants.map((x) => (x.key === c.key ? { ...x, key: nextKey } : x)))
                                }}
                              />
                            </div>
                            <div className="md:col-span-4">
                              <Label className="text-xs">Label (opcional)</Label>
                              <Input className="h-8" value={c.label ?? ""} onChange={(e) => updateConstant(c.key, { label: e.target.value })} />
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={kind}
                                onValueChange={(v) => updateConstant(c.key, { kind: v as any, value: 0 })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="static">Valor fijo</SelectItem>
                                  <SelectItem value="filtered_agg">Agregado con filtro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2 flex items-end justify-end">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteConstant(c.key)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Fila 2: según tipo */}
                          {kind === "static" ? (
                            <div className="md:col-span-3">
                              <Label className="text-xs">Valor</Label>
                              <Input
                                type="number"
                                className="h-8 max-w-[160px]"
                                value={Number.isFinite(c.value) ? c.value : 0}
                                onChange={(e) => updateConstant(c.key, { value: Number(e.target.value) })}
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-muted/30 rounded p-2">
                              <div className="md:col-span-4">
                                <Label className="text-xs">Campo a agregar</Label>
                                <Select
                                  value={c.field ?? ""}
                                  onValueChange={(v) => updateConstant(c.key, { field: v })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Seleccionar..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {numericFields.map((f) => (
                                      <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-xs">Operación</Label>
                                <Select
                                  value={c.agg ?? "sum"}
                                  onValueChange={(v) => updateConstant(c.key, { agg: v as KPIOperation })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(["sum","mean","min","max","count","median"] as KPIOperation[]).map((op) => (
                                      <SelectItem key={op} value={op}>{KPI_OPERATION_LABELS[op] ?? op}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-xs">Filtrar por campo</Label>
                                <Select
                                  value={c.filterField ?? "__none__"}
                                  onValueChange={(v) => updateConstant(c.key, { filterField: v === "__none__" ? undefined : v })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Sin filtro" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">Sin filtro</SelectItem>
                                    {uniqueFields.map((f) => (
                                      <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-3">
                                <Label className="text-xs">Valor del filtro</Label>
                                <Input
                                  className="h-8"
                                  value={c.filterValue ?? ""}
                                  placeholder={c.filterField ? `Ej: "Colombia"` : "—"}
                                  disabled={!c.filterField}
                                  onChange={(e) => updateConstant(c.key, { filterValue: e.target.value })}
                                />
                              </div>
                              <div className="md:col-span-12">
                                <p className="text-[11px] text-muted-foreground">
                                  Resultado en tiempo real: se calcula sobre los datos filtrados del dashboard.
                                  {c.field && <span className="font-mono ml-1">{c.agg ?? "sum"}({c.field}){c.filterField ? ` donde ${c.filterField} = "${c.filterValue}"` : ""}</span>}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Colores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Colores de Marca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {(["primario", "secundario", "acento"] as const).map((k) => (
                      <div key={k} className="space-y-2">
                        <Label className="text-xs">
                          {k === "primario" ? "Color Primario" : k === "secundario" ? "Color Secundario" : "Color de Acento"}
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={(config.paletaColores as any)?.[k] || (k === "secundario" ? "#ffffff" : k === "acento" ? "#FFB000" : "#000000")}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  paletaColores: {
                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                    [k]: e.target.value,
                                  } as any,
                                })
                              }
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={(config.paletaColores as any)?.[k] || (k === "secundario" ? "#ffffff" : k === "acento" ? "#FFB000" : "#000000")}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                paletaColores: {
                                  ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                  [k]: e.target.value,
                                } as any,
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Plantillas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cargar desde Plantilla</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select onValueChange={loadTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{template.nombre}</span>
                            <Badge variant="outline" className="ml-2">
                              {template.categoria}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Filtros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={availableFilters.length === 0}
                    onClick={() => {
                      const first = availableFilters[0]
                      const next = [...(config.filtros?.condiciones ?? [])]
                      next.push({
                        campo: first.name as any,
                        operador: ((first as any)?.operators?.[0] ?? "eq") as any,
                        valor: "",
                        columnas: 4, // NUEVO: default 4 columnas
                      } as any)
                      setConfig({ ...config, filtros: { ...config.filtros, condiciones: next } })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar filtro
                  </Button>

                  {(config?.filtros?.condiciones ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay filtros adicionales configurados.</p>
                  ) : (
                    <div className="space-y-2">
                      {(config!.filtros.condiciones ?? []).map((f: any, idx: number) => {
                        const def = availableFilters.find((x) => x.name === f.campo)
                        const ops: string[] = (def as any)?.operators ?? ["eq"]

                        return (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2">
                            <div className="md:col-span-4">
                              <Label className="text-xs">Campo</Label>
                              <Select
                                value={String(f.campo)}
                                onValueChange={(campo) => {
                                  const d = availableFilters.find((x) => x.name === campo)
                                  const op = ((d as any)?.operators?.[0] ?? "eq") as any
                                  const next = [...(config!.filtros.condiciones ?? [])]
                                  next[idx] = { 
                                    campo: campo as any, 
                                    operador: op, 
                                    valor: "",
                                    columnas: f.columnas ?? 4 
                                  } as any
                                  setConfig({ ...config!, filtros: { ...config!.filtros, condiciones: next } })
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFilters.map((af) => (
                                    <SelectItem key={af.name} value={af.name}>
                                      {af.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="md:col-span-3">
                              <Label className="text-xs">Operador</Label>
                              <Select
                                value={String(f.operador)}
                                onValueChange={(operador) => {
                                  const next = [...(config!.filtros.condiciones ?? [])]
                                  next[idx] = { ...next[idx], operador: operador as any } as any
                                  setConfig({ ...config!, filtros: { ...config!.filtros, condiciones: next } })
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ops.map((o: string) => (
                                    <SelectItem key={o} value={o}>
                                      {o}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-xs">Valor</Label>
                              <Input
                                className="h-8"
                                value={String(f.valor ?? "")}
                                onChange={(e) => {
                                  const next = [...(config!.filtros.condiciones ?? [])]
                                  next[idx] = { ...next[idx], valor: e.target.value } as any
                                  setConfig({ ...config!, filtros: { ...config!.filtros, condiciones: next } })
                                }}
                              />
                            </div>

                            {/* NUEVO: Campo de columnas */}
                            <div className="md:col-span-2">
                              <Label className="text-xs">Cols (1-12)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={12}
                                className="h-8"
                                value={(f as FilterCondition).columnas ?? 4}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 4
                                  const next = [...(config!.filtros.condiciones ?? [])]
                                  next[idx] = { ...next[idx], columnas: Math.max(1, Math.min(12, val)) } as any
                                  setConfig({ ...config!, filtros: { ...config!.filtros, condiciones: next } })
                                }}
                              />
                            </div>

                            <div className="md:col-span-1 flex items-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const next = [...(config!.filtros.condiciones ?? [])].filter((_, i) => i !== idx)
                                  setConfig({ ...config!, filtros: { ...config!.filtros, condiciones: next } })
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {lastImportId && (
                    <p className="text-xs text-muted-foreground">
                      Último import detectado: <span className="font-mono">{lastImportId}</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* KPIs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      KPIs ({config.kpis.length}/{DEFAULT_LIMITS.maxKPIs})
                      {isLoadingFields && <span className="ml-2 text-xs text-muted-foreground">Cargando campos...</span>}
                    </CardTitle>
                    <Button size="sm" onClick={addKPI} disabled={isLoadingFields || availableFields.length === 0}>
                      <Plus className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Agregar KPI</span>
                      <span className="md:hidden">KPI</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {availableFields.length === 0 && !isLoadingFields ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>No hay datos importados para esta campaña. Sube un archivo Excel primero.</AlertDescription>
                    </Alert>
                  ) : kpisTyped.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay KPIs configurados</p>
                  ) : (
                    kpisTyped.map((kpi) => {
                      const kind: KPIKind = (kpi.kind ?? "field") as KPIKind
                      const fieldInfo = availableFields.find((f) => f.name === kpi.fuente)

                      const validOps = kind === "field" ? getValidOperationsForType(fieldInfo?.type ?? "unknown") : ["count"]
                      const kpiOptions = kpisTyped.filter((x) => x.id !== kpi.id)

                      const formato = (kpi.formato ?? "number") as KPIFormat
                      const decimales = clamp(Number(kpi.decimales ?? 0), 0, 6)
                      const unidad = String(kpi.unidad ?? "")

                      const aRaw = kpi.formula?.aKpiId ?? ""
                      const bRaw = kpi.formula?.bKpiId ?? ""
                      const aRef = parseOperandRef(aRaw)
                      const bRef = parseOperandRef(bRaw)

                      return (
                        <div key={kpi.id} className="border rounded-lg p-2 sm:p-3 space-y-3 hover:bg-muted/50">
                          {/* Header */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                            <div className="md:col-span-3">
                              <Label className="text-xs">Nombre</Label>
                              <Input value={kpi.nombre} onChange={(e) => updateKPI(kpi.id, { nombre: e.target.value })} className="h-8" />
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-xs">Tipo</Label>
                              <Select
                                value={kind}
                                onValueChange={(v) => {
                                  const nextKind = v as KPIKind
                                  if (nextKind === "formula") {
                                    const a = kpiOptions[0]?.id ? `kpi:${kpiOptions[0].id}` : ""
                                    const b = kpiOptions[1]?.id ? `kpi:${kpiOptions[1].id}` : (kpiOptions[0]?.id ? `kpi:${kpiOptions[0].id}` : "")
                                    updateKPI(kpi.id, {
                                      kind: "formula",
                                      operacion: "count" as any,
                                      countField: undefined,
                                      formula: { aKpiId: a, op: "div", bKpiId: b },
                                      visible: kpi.visible ?? true,
                                      formato: kpi.formato ?? "number",
                                      decimales: kpi.decimales ?? 2,
                                      unidad: kpi.unidad ?? "",
                                      columnas: kpi.columnas ?? 3,
                                    })
                                  } else if (nextKind === "expression") {
                                    updateKPI(kpi.id, {
                                      kind: "expression",
                                      operacion: "count" as any,
                                      formula: undefined,
                                      expression: "",
                                      visible: kpi.visible ?? true,
                                      formato: kpi.formato ?? "number",
                                      decimales: kpi.decimales ?? 2,
                                      unidad: kpi.unidad ?? "",
                                      columnas: kpi.columnas ?? 3,
                                    })
                                  } else {
                                    const firstField = availableFields[0]
                                    updateKPI(kpi.id, {
                                      kind: "field",
                                      fuente: ((firstField?.name as any) ?? kpi.fuente) as any,
                                      operacion: firstField?.type === "number" ? ("sum" as any) : ("count" as any),
                                      countField: "__rows__",
                                      formula: undefined,
                                      expression: undefined,
                                      visible: kpi.visible ?? true,
                                      formato: kpi.formato ?? (firstField?.type === "number" ? "number" : "number"),
                                      decimales: kpi.decimales ?? 0,
                                      unidad: kpi.unidad ?? "",
                                      columnas: kpi.columnas ?? 3,
                                    })
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="field">Campo</SelectItem>
                                  <SelectItem value="formula">Fórmula (A op B)</SelectItem>
                                  <SelectItem value="expression">Expresión libre [col1]+[col2]…</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-xs">Vis.</Label>
                              <div className="h-8 flex items-center justify-between border rounded px-3 bg-background">
                                <span className="text-xs text-muted-foreground">Visible</span>
                                <Switch checked={kpi.visible !== false} onCheckedChange={(checked) => updateKPI(kpi.id, { visible: checked })} />
                              </div>
                            </div>

                            {/* NUEVO: Campo de columnas */}
                            <div className="md:col-span-2">
                              <Label className="text-xs">Cols</Label>
                              <Input
                                type="number"
                                min={1}
                                max={12}
                                className="h-8"
                                value={kpi.columnas ?? 3}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 3
                                  updateKPI(kpi.id, { columnas: Math.max(1, Math.min(12, val)) })
                                }}
                              />
                            </div>

                            <div className="md:col-span-1 flex justify-end">
                              <Button variant="ghost" size="sm" onClick={() => deleteKPI(kpi.id)} className="h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Body - Campo o Fórmula */}
                          {kind === "field" ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                              <div className="md:col-span-7">
                                <Label className="text-xs">
                                  Fuente de Datos
                                  {fieldInfo && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {fieldInfo.type}
                                    </Badge>
                                  )}
                                </Label>

                                <Select
                                  value={kpi.fuente}
                                  onValueChange={(value) => {
                                    const field = availableFields.find((f) => f.name === value)
                                    const newOps = getValidOperationsForType(field?.type ?? "unknown")
                                    const currentOpValid = newOps.includes(kpi.operacion)
                                    const nextOp = (currentOpValid ? kpi.operacion : (newOps[0] as KPIOperation)) as KPIOperation

                                    updateKPI(kpi.id, {
                                      fuente: value as DataSource,
                                      operacion: nextOp,
                                      countField: nextOp === "count" ? (kpi.countField ?? "__rows__") : undefined,
                                      formato: kpi.formato ?? (field?.type === "number" ? "number" : "number"),
                                    })
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {uniqueFields.map((field) => (
                                      <SelectItem key={field.name} value={field.name}>
                                        <div className="flex items-center gap-2">
                                          <span>{safeLabel(field.name)}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {field.type}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="md:col-span-5">
                                <Label className="text-xs">Operación</Label>
                                <Select
                                  value={kpi.operacion}
                                  onValueChange={(value) => {
                                    const op = value as KPIOperation
                                    updateKPI(kpi.id, {
                                      operacion: op,
                                      countField: op === "count" ? (kpi.countField ?? "__rows__") : undefined,
                                    })
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {validOps.map((op) => (
                                      <SelectItem key={op} value={op}>
                                        {KPI_OPERATION_LABELS[op as KPIOperation] ?? op}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {kpi.operacion === "count" && (
                                <div className="md:col-span-12">
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                    <div className="md:col-span-8">
                                      <Label className="text-xs">Qué contar</Label>
                                      <Select
                                        value={String(kpi.countField ?? "__rows__")}
                                        onValueChange={(value) => updateKPI(kpi.id, { countField: value as any })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__rows__">Filas (COUNT rows)</SelectItem>
                                          {uniqueFields.map((field) => (
                                            <SelectItem key={field.name} value={field.name}>
                                              {safeLabel(field.name)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <p className="text-[11px] text-muted-foreground mt-1">
                                        Filas = total registros. Campo = cuenta registros donde ese campo no está vacío.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : kind === "expression" ? (
                            <div className="border rounded-lg p-3 bg-background space-y-3">
                              <Label className="text-xs">Expresión libre</Label>
                              <div className="space-y-1">
                                <Input
                                  className="h-8 font-mono text-xs"
                                  value={kpi.expression ?? ""}
                                  onChange={(e) => updateKPI(kpi.id, { expression: e.target.value })}
                                  placeholder="[Campo1] + {const_1} * 0.5"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  <code className="bg-muted px-1 rounded">[Campo]</code> → sum del campo.{" "}
                                  <code className="bg-muted px-1 rounded">{"{const_key}"}</code> → valor de la constante.
                                  Operadores: +, -, *, /, paréntesis y números fijos.
                                </p>
                              </div>
                              {numericFields.length > 0 && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Campos numéricos (click para insertar)</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {numericFields.map((f, _fi) => (
                                      <button
                                        key={`${f.name}__${_fi}`}
                                        type="button"
                                        className="text-xs bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 px-2 py-0.5 rounded font-mono border transition-colors"
                                        onClick={() => updateKPI(kpi.id, { expression: (kpi.expression ?? "") + `[${f.name}]` })}
                                      >
                                        [{f.name}]
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {constants.length > 0 && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Constantes (click para insertar)</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {constants.map((c) => (
                                      <button
                                        key={c.key}
                                        type="button"
                                        className="text-xs bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-2 py-0.5 rounded font-mono border border-amber-200 dark:border-amber-800 transition-colors"
                                        title={`Valor actual: ${Number.isFinite(c.value) ? c.value.toLocaleString("es-CO") : "calculado en runtime"}`}
                                        onClick={() => updateKPI(kpi.id, { expression: (kpi.expression ?? "") + `{${c.key}}` })}
                                      >
                                        {"{"}
                                        {c.key}
                                        {"}"}{" "}
                                        <span className="opacity-60 text-[10px] font-sans not-italic">
                                          {c.label ? `(${c.label})` : ""}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Otros KPIs como operandos */}
                              {kpisTyped.filter((x) => x.id !== kpi.id).length > 0 && (
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Otros KPIs (click para insertar)</Label>
                                  <p className="text-[11px] text-muted-foreground mb-1">
                                    Se inserta el valor del KPI. Si tiene escala ÷100 configurada, se aplica automáticamente.
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {kpisTyped.filter((x) => x.id !== kpi.id).map((k) => {
                                      const fmt = k.formato ?? "number"
                                      const escalaTag = (k as any).escala === 0.01 ? " ÷100" : (k as any).escala && (k as any).escala !== 1 ? ` ×${(k as any).escala}` : ""
                                      return (
                                        <button
                                          key={k.id}
                                          type="button"
                                          className="text-xs bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-0.5 rounded font-mono border border-blue-200 dark:border-blue-800 transition-colors"
                                          title={`KPI: ${k.nombre} (${fmt}${escalaTag})`}
                                          onClick={() => updateKPI(kpi.id, { expression: (kpi.expression ?? "") + `{kpi:${k.id}}` })}
                                        >
                                          {k.nombre}
                                          {escalaTag && (
                                            <span className="opacity-60 text-[10px] font-sans ml-1">{escalaTag}</span>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="border rounded-lg p-3 bg-background space-y-3">
                              <Label className="text-xs">Fórmula</Label>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
                                {/* A */}
                                <div className="lg:col-span-5">
                                  <Label className="text-xs">Operando A</Label>
                                  <Select
                                    value={aRef.kind === "num" ? "__num__" : (aRaw ? (aRaw.startsWith("kpi:") || aRaw.startsWith("const:") ? aRaw : `kpi:${aRaw}`) : "")}
                                    onValueChange={(value) => {
                                      if (value === "__num__") {
                                        updateKPI(kpi.id, { formula: { ...(kpi.formula ?? { op: "div", bKpiId: "" }), aKpiId: "num:0" } })
                                      } else {
                                        updateKPI(kpi.id, { formula: { ...(kpi.formula ?? { op: "div", bKpiId: "" }), aKpiId: value } })
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operandOptions.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                          {o.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {aRef.kind === "num" && (
                                    <div className="mt-2">
                                      <Label className="text-[11px] text-muted-foreground">Número fijo</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={Number.isFinite(aRef.value) ? aRef.value : 0}
                                        onChange={(e) => updateKPI(kpi.id, { formula: { ...(kpi.formula as any), aKpiId: `num:${Number(e.target.value)}` } })}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* OP */}
                                <div className="lg:col-span-2">
                                  <Label className="text-xs">Operación</Label>
                                  <Select
                                    value={kpi.formula?.op ?? "div"}
                                    onValueChange={(value) => {
                                      const op = value as KPIFormulaOp
                                      updateKPI(kpi.id, {
                                        formula: { ...(kpi.formula ?? { aKpiId: "", bKpiId: "" }), op },
                                        formato: op === "pct" ? (kpi.formato ?? "percent") : kpi.formato,
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="add">A + B</SelectItem>
                                      <SelectItem value="sub">A - B</SelectItem>
                                      <SelectItem value="mul">A * B</SelectItem>
                                      <SelectItem value="div">A / B</SelectItem>
                                      <SelectItem value="pct">A / B (%)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* B */}
                                <div className="lg:col-span-5">
                                  <Label className="text-xs">Operando B</Label>
                                  <Select
                                    value={bRef.kind === "num" ? "__num__" : (bRaw ? (bRaw.startsWith("kpi:") || bRaw.startsWith("const:") ? bRaw : `kpi:${bRaw}`) : "")}
                                    onValueChange={(value) => {
                                      if (value === "__num__") {
                                        updateKPI(kpi.id, { formula: { ...(kpi.formula ?? { op: "div", aKpiId: "" }), bKpiId: "num:0" } })
                                      } else {
                                        updateKPI(kpi.id, { formula: { ...(kpi.formula ?? { op: "div", aKpiId: "" }), bKpiId: value } })
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operandOptions.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                          {o.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {bRef.kind === "num" && (
                                    <div className="mt-2">
                                      <Label className="text-[11px] text-muted-foreground">Número fijo</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={Number.isFinite(bRef.value) ? bRef.value : 0}
                                        onChange={(e) => updateKPI(kpi.id, { formula: { ...(kpi.formula as any), bKpiId: `num:${Number(e.target.value)}` } })}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <p className="text-[11px] text-muted-foreground">
                                Tip: puedes encadenar KPIs fórmula. Ej: (Ventas - Costos) = Margen, luego Margen / Ventas (%) = Margen %.
                              </p>
                            </div>
                          )}

                          {/* Formato */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <div className="md:col-span-3">
                              <Label className="text-xs">Formato</Label>
                              <Select value={String(formato)} onValueChange={(v) => updateKPI(kpi.id, { formato: v as KPIFormat })}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="number">Número</SelectItem>
                                  <SelectItem value="currency">Moneda</SelectItem>
                                  <SelectItem value="percent">Porcentaje</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="md:col-span-4">
                              <Label className="text-xs">Unidad (opcional)</Label>
                              <Input className="h-8" value={unidad} onChange={(e) => updateKPI(kpi.id, { unidad: e.target.value })} placeholder='Ej: "COP", "USD", "visitas"' />
                            </div>

                            <div className="md:col-span-3">
                              <Label className="text-xs">Decimales</Label>
                              <Input
                                type="number"
                                min={0}
                                max={6}
                                className="h-8"
                                value={decimales}
                                onChange={(e) => updateKPI(kpi.id, { decimales: clamp(parseInt(e.target.value || "0"), 0, 6) })}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-xs">Escala al usar en fórmulas</Label>
                              <Select
                                value={String(kpi.escala ?? 1)}
                                onValueChange={(v) => updateKPI(kpi.id, { escala: Number(v) })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">× 1 (sin cambio)</SelectItem>
                                  <SelectItem value="0.01">÷ 100 (% → decimal)</SelectItem>
                                  <SelectItem value="0.001">÷ 1000</SelectItem>
                                  <SelectItem value="1000">× 1.000</SelectItem>
                                  <SelectItem value="1000000">× 1.000.000</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {kpi.escala === 0.01
                                  ? "75% se usará como 0.75 en fórmulas"
                                  : kpi.escala && kpi.escala !== 1
                                  ? `El valor se multiplica por ${kpi.escala} al ser operando`
                                  : "El valor se usa tal cual"}
                              </p>
                            </div>
                          </div>

                          {/* Categoría: filtro previo del KPI */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border-t pt-2 mt-1">
                            <div className="md:col-span-5">
                              <Label className="text-xs">Filtrar por campo (categoría)</Label>
                              <Select
                                value={kpi.categoriaField ?? "__none__"}
                                onValueChange={(v) => updateKPI(kpi.id, {
                                  categoriaField: v === "__none__" ? undefined : v,
                                  categoriaValue: undefined,
                                })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Sin filtro" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin filtro de categoría</SelectItem>
                                  {uniqueFields.map((f) => (
                                    <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-5">
                              <Label className="text-xs">Valor de categoría</Label>
                              {(() => {
                                if (!kpi.categoriaField) return <Input className="h-8" disabled placeholder="—" />
                                const opts = kpiFieldOptions[kpi.categoriaField]
                                const isLoading = kpiFieldOptionsLoading[kpi.categoriaField]
                                const hasOpts = Array.isArray(opts) && opts.length > 0
                                const wasAttempted = Array.isArray(opts) // undefined = no intentado aún, [] = intentado vacío

                                // Si tiene opciones: Select
                                if (hasOpts) {
                                  return (
                                    <Select
                                      value={kpi.categoriaValue ?? "__all__"}
                                      onValueChange={(v) =>
                                        updateKPI(kpi.id, { categoriaValue: v === "__all__" ? undefined : v })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Seleccionar valor…" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__all__">— Sin filtro —</SelectItem>
                                        {opts.map((v) => (
                                          <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )
                                }

                                // Si está cargando: input deshabilitado
                                if (isLoading) {
                                  return <Input className="h-8" disabled placeholder="Cargando opciones…" />
                                }

                                // Si no se ha intentado cargar aún: botón + input
                                if (!wasAttempted) {
                                  return (
                                    <div className="flex gap-1">
                                      <Input
                                        className="h-8 flex-1"
                                        value={kpi.categoriaValue ?? ""}
                                        onChange={(e) => updateKPI(kpi.id, { categoriaValue: e.target.value || undefined })}
                                        placeholder="Escribe o carga opciones…"
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 text-xs shrink-0"
                                        onClick={() => loadKpiFieldOptions(kpi.categoriaField!)}
                                      >
                                        Cargar
                                      </Button>
                                    </div>
                                  )
                                }

                                // Si se intentó pero vino vacío: input de texto libre
                                return (
                                  <div className="space-y-1">
                                    <Input
                                      className="h-8"
                                      value={kpi.categoriaValue ?? ""}
                                      onChange={(e) => updateKPI(kpi.id, { categoriaValue: e.target.value || undefined })}
                                      placeholder="Escribe el valor exacto…"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                      No se encontraron opciones vía API — escribe el valor manualmente.
                                    </p>
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="md:col-span-2 flex items-end pb-1">
                              {kpi.categoriaField && kpi.categoriaValue && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">✓ Activo</span>
                              )}
                            </div>
                            {kpi.categoriaField && (
                              <div className="md:col-span-12">
                                <p className="text-[11px] text-muted-foreground">
                                  Solo cuenta filas donde{" "}
                                  <code className="bg-muted px-1 rounded">{kpi.categoriaField}</code>
                                  {" "}={" "}
                                  <code className="bg-muted px-1 rounded">"{kpi.categoriaValue || "…"}"</code>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Filas / Gráficos - mantener igual que antes */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Dashboard ({config.filas.length}/{DEFAULT_LIMITS.maxFilas} filas)</CardTitle>
                    <Button size="sm" onClick={addRow} disabled={availableFields.length === 0}>
                      <Plus className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Agregar Fila</span>
                      <span className="md:hidden">Fila</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {availableFields.length === 0 && !isLoadingFields ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>No hay datos importados. Sube un archivo Excel para poder crear gráficos.</AlertDescription>
                    </Alert>
                  ) : config.filas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay filas configuradas</p>
                  ) : (
                    config.filas.map((row) => (
                      <div key={row.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 flex-wrap">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Fila {row.orden}</span>
                            <Badge variant="outline" className="text-xs">
                              {row.graficos.length}/{DEFAULT_LIMITS.maxGraficosPorFila} gráficos
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs whitespace-nowrap text-muted-foreground">Alto px</Label>
                              <Input
                                type="number"
                                min={200}
                                max={800}
                                step={40}
                                className="h-7 w-20 text-xs"
                                value={(row as any).altura ?? 320}
                                onChange={(e) => {
                                  const val = Math.max(200, Math.min(800, parseInt(e.target.value) || 320))
                                  setConfig({
                                    ...config!,
                                    filas: config!.filas.map((r) =>
                                      r.id === row.id ? ({ ...r, altura: val } as any) : r
                                    ),
                                  })
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addChartToRow(row.id)}>
                              <Plus className="h-4 w-4 md:mr-1" />
                              <span className="hidden md:inline">Gráfico</span>
                              <span className="md:hidden">+</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteRow(row.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pl-2 sm:pl-6">
                          {row.graficos.map((chartBase) => {
                            const chart = chartBase as AnyChart
                            const err = validateChart(chart)
                            const mt: MeasureType = chart.measureType ?? "count"

                            // Campos filtrados al slot de este gráfico
                            const chartSlot = chart.sourceLabel ?? "primary"
                            const chartAvailableFields = availableFields.filter(
                              f => !(f as any).sourceLabel || (f as any).sourceLabel === chartSlot
                            )
                            const chartTextFields = chartAvailableFields.filter(
                              f => f.type === "text" || f.type === "date" || f.type === "boolean" || f.type === "unknown"
                            )
                            const chartNumericFields = chartAvailableFields.filter(f => f.type === "number")
                            const chartAllFieldNames = chartAvailableFields.map(f => f.name)

                            const groupableFields = chartTextFields.length ? chartTextFields : chartAvailableFields
                            const canToggleNumeric = chartNumericFields.length > 0

                            const showMultiMetrics =
                              mt === "numeric" &&
                              chart.tipo !== "scatter" &&
                              ["barras", "spline", "area", "radar", "tabla", "heatmap", "treemap", "funnel", "combo"].includes(chart.tipo as string)

                            const isCombo = (chart.tipo as string) === "combo"

                            return (
                              <div key={chart.id} className="border rounded p-2 sm:p-3 bg-muted/30 space-y-2">
                                {err && (
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">{err}</AlertDescription>
                                  </Alert>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                                  <div className="col-span-1 sm:col-span-6 lg:col-span-3">
                                    <Label className="text-xs">Título</Label>
                                    <Input value={chart.titulo} onChange={(e) => updateChart(row.id, chart.id, { titulo: e.target.value })} className="h-8" />
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                                    <Label className="text-xs">Label eje X (opcional)</Label>
                                    <Input
                                      value={(chart as any).labelX ?? ""}
                                      onChange={(e) => updateChart(row.id, chart.id, { labelX: e.target.value } as any)}
                                      className="h-8"
                                      placeholder="Ej: Mes, Ciudad..."
                                    />
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                                    <Label className="text-xs">Label eje Y (opcional)</Label>
                                    <Input
                                      value={(chart as any).labelY ?? ""}
                                      onChange={(e) => updateChart(row.id, chart.id, { labelY: e.target.value } as any)}
                                      className="h-8"
                                      placeholder="Ej: Ventas, Unidades..."
                                    />
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                                    <Label className="text-xs">Slot de datos</Label>
                                    <Select
                                      value={chart.sourceLabel ?? "primary"}
                                      onValueChange={(v) => updateChart(row.id, chart.id, { sourceLabel: v } as any)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {/* Slots disponibles según availableFields */}
                                        {Array.from(
                                          new Set(
                                            ["primary", ...availableFields
                                              .map(f => (f as any).sourceLabel)
                                              .filter(Boolean)]
                                          )
                                        ).map(slot => (
                                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                                    <Label className="text-xs">Tipo de Gráfico</Label>
                                    <Select
                                      value={chart.tipo as any}

                                      onValueChange={(value) => {
                                        const nextType = value as ChartType
                                        const nextUpdates: Partial<AnyChart> = { tipo: nextType }

                                        if (nextType === "scatter") {
                                          nextUpdates.measureType = "numeric"
                                          nextUpdates.agg = (chart.agg ?? "sum") as KPIOperation
                                          nextUpdates.metric = chart.metric ?? numericFields[0]?.name
                                          nextUpdates.metric2 = chart.metric2 ?? numericFields[1]?.name ?? numericFields[0]?.name
                                          nextUpdates.metrics = []
                                        }

                                        if (nextType === "combo") {
                                          nextUpdates.measureType = "numeric"
                                          const f1 = numericFields[0]?.name
                                          const f2 = numericFields[1]?.name ?? numericFields[0]?.name
                                          nextUpdates.metrics =
                                            f1 && f2
                                              ? [
                                                  { field: f1 as any, agg: "sum", axis: "left", render: "bar" },
                                                  { field: f2 as any, agg: "sum", axis: "right", render: "line" },
                                                ]
                                              : []
                                          nextUpdates.countField = undefined
                                        }

                                        updateChart(row.id, chart.id, nextUpdates)
                                      }}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ALL_CHART_TYPES.map((tipo) => (
                                          <SelectItem key={String(tipo)} value={tipo as any}>
                                            {(CHART_TYPE_LABELS as any)?.[tipo] ?? String(tipo)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-4">
                                    <Label className="text-xs">Fuente de Datos (legacy)</Label>
                                    <Select value={chart.fuente as any} onValueChange={(value) => updateChart(row.id, chart.id, { fuente: value as any })}>
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableFields.map((field) => (
                                          <SelectItem key={`${field.name}__${(field as any).sourceLabel ?? "primary"}`} value={field.name}>                                            <div className="flex items-center gap-2">
                                              <span>{safeLabel(field.name)}</span>
                                              <Badge variant="outline" className="text-xs">
                                                {field.type}
                                              </Badge>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-1">
                                    <Label className="text-xs">Cols</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={chart.columnas}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value)
                                        updateChart(row.id, chart.id, { columnas: ((val >= 1 && val <= 12 ? val : 6) as BootstrapCol) })
                                      }}
                                      className="h-8"
                                    />
                                  </div>

                                  <div className="col-span-1 sm:col-span-3 lg:col-span-1 flex items-end">
                                    <Button variant="ghost" size="sm" onClick={() => deleteChart(row.id, chart.id)} className="h-8 w-8 p-0">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Ejes */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                                  <div className="lg:col-span-4">
                                    <Label className="text-xs">Eje X (Group By)</Label>
                                    <Select value={String(chart.groupBy ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { groupBy: value as any, labelField: chart.labelField ?? (value as any) })}>
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Seleccionar campo..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {groupableFields.map((f) => (
                                          <SelectItem key={`${f.name}__${(f as any).sourceLabel ?? "primary"}`} value={f.name}>
                                            <div className="flex items-center gap-2">
                                              <span>{safeLabel(f.name)}</span>
                                              <Badge variant="outline" className="text-xs">
                                                {f.type}
                                              </Badge>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="lg:col-span-3">
                                    <Label className="text-xs">Métrica</Label>
                                    <div className="h-8 flex items-center justify-between border rounded px-3 bg-background">
                                      <span className="text-xs text-muted-foreground">Usar métrica numérica</span>
                                      <Switch
                                        checked={mt === "numeric"}
                                        disabled={!canToggleNumeric || chart.tipo === "scatter" || isCombo}
                                        onCheckedChange={(checked) => {
                                          if (!canToggleNumeric) return
                                          if (checked) {
                                            updateChart(row.id, chart.id, {
                                              measureType: "numeric",
                                              agg: (chart.agg ?? "sum") as any,
                                              metric: chart.metric ?? numericFields[0]?.name,
                                              countField: undefined,
                                              metrics: chart.metrics ?? [],
                                            })
                                          } else {
                                            updateChart(row.id, chart.id, {
                                              measureType: "count",
                                              countField: (chart.countField ?? "__rows__") as any,
                                              metric: undefined,
                                              agg: undefined,
                                              metrics: [],
                                            })
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {mt === "count" ? (
                                    <div className="lg:col-span-5">
                                      <Label className="text-xs">Eje Y (Conteo)</Label>
                                      <Select value={String(chart.countField ?? "__rows__")} onValueChange={(value) => updateChart(row.id, chart.id, { measureType: "count", countField: value as any })}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__rows__">Filas (COUNT rows)</SelectItem>
                                          {allFieldNames.map((name) => (
                                            <SelectItem key={name} value={name}>
                                              {safeLabel(name)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    <div className="lg:col-span-5">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="min-w-0">
                                          <Label className="text-xs">Operación (legacy)</Label>
                                          <Select value={String(chart.agg ?? "sum")} onValueChange={(value) => updateChart(row.id, chart.id, { agg: value as any, measureType: "numeric" })}>
                                            <SelectTrigger className="h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                            {getNumericAggOps().map((op) => (
                                              <SelectItem key={op} value={op}>
                                                {KPI_OPERATION_LABELS[op]}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="min-w-0">
                                          <Label className="text-xs">Campo numérico (legacy)</Label>
                                          <Select value={String(chart.metric ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { metric: value as any, measureType: "numeric" })}>
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {numericFields.map((f) => (
                                                <SelectItem key={`${f.name}__${(f as any).sourceLabel ?? "primary"}`} value={f.name}>
                                                  <div className="flex items-center gap-2">
                                                    <span>{safeLabel(f.name)}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                      {f.type}
                                                    </Badge>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      {chart.tipo === "scatter" && (
                                        <div className="mt-2">
                                          <Label className="text-xs">Campo numérico 2 (Scatter Y)</Label>
                                          <Select value={String(chart.metric2 ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { metric2: value as any })}>
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {numericFields.map((f) => (
                                                <SelectItem key={`${f.name}__${(f as any).sourceLabel ?? "primary"}`} value={f.name}>
                                                  {safeLabel(f.name)}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Multi-métricas */}
                                {showMultiMetrics && (
                                  <div className="border rounded bg-background p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium">{isCombo ? "Métricas (Combo: Bar + Line)" : "Métricas (multi)"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {isCombo ? "Elige Bar o Line por métrica." : "Agrega todas las métricas que quieras (y eje left/right)."}
                                        </p>
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => addMetricToChart(row.id, chart.id)} disabled={!numericFields.length}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar métrica
                                      </Button>
                                    </div>

                                    {(chart.metrics ?? []).length === 0 ? (
                                      <p className="text-xs text-muted-foreground">No hay métricas aún.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {(chart.metrics ?? []).map((m: ChartMetricDefinition, idx: number) => (
                                          <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-2 border rounded p-2">
                                            <div className="lg:col-span-4">
                                              <Label className="text-xs">Campo</Label>
                                              <Select value={String(m.field)} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { field: value as any })}>
                                                <SelectTrigger className="h-8">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {numericFields.map((f) => (
                                                    <SelectItem key={`${f.name}__${(f as any).sourceLabel ?? "primary"}`} value={f.name}>
                                                      <div className="flex items-center gap-2">
                                                        <span>{safeLabel(f.name)}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                          {f.type}
                                                        </Badge>
                                                      </div>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="lg:col-span-3">
                                              <Label className="text-xs">Operación</Label>
                                              <Select value={String(m.agg ?? "sum")} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { agg: value as any })}>
                                                <SelectTrigger className="h-8">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                {getNumericAggOps().map((op) => (
                                                  <SelectItem key={op} value={op}>
                                                    {KPI_OPERATION_LABELS[op]}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="lg:col-span-2">
                                              <Label className="text-xs">Eje</Label>
                                              <Select value={String(m.axis ?? "left")} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { axis: value as MetricAxis })}>
                                                <SelectTrigger className="h-8">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="left">Left</SelectItem>
                                                  <SelectItem value="right">Right</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {isCombo && (
                                              <div className="lg:col-span-2">
                                                <Label className="text-xs">Render</Label>
                                                <Select value={String(m.render ?? "bar")} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { render: value as MetricRender })}>
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="bar">Bar</SelectItem>
                                                    <SelectItem value="line">Line</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            )}

                                            <div className={`flex items-end ${isCombo ? "lg:col-span-1" : "lg:col-span-3"} justify-end`}>
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteMetric(row.id, chart.id, idx)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Series */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                                  <div className="lg:col-span-6">
                                    <Label className="text-xs">Series (opcional)</Label>
                                    <Select
                                      value={String(chart.seriesBy ?? "")}
                                      onValueChange={(value) => updateChart(row.id, chart.id, { seriesBy: value === "__none__" ? undefined : (value as any) })}
                                      disabled={isCombo}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder={isCombo ? "No disponible en Combo" : "Sin series"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Sin series</SelectItem>
                                        {textFields.map((f) => (
                                          <SelectItem key={`${f.name}__${(f as any).sourceLabel ?? "primary"}`} value={f.name}>
                                            {safeLabel(f.name)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="lg:col-span-3">
                                    <Label className="text-xs">Orientación</Label>
                                    <Select value={String(chart.barOrientation ?? "vertical")} onValueChange={(value) => updateChart(row.id, chart.id, { barOrientation: value as any })}>
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="vertical">Vertical</SelectItem>
                                        <SelectItem value="horizontal">Horizontal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="lg:col-span-3">
                                    <Label className="text-xs">Modo barras</Label>
                                    <Select value={String(chart.barMode ?? "grouped")} onValueChange={(value) => updateChart(row.id, chart.id, { barMode: value as any })}>
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="grouped">Grouped</SelectItem>
                                        <SelectItem value="stacked">Stacked</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Bar size + reference KPI */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mt-2">
                                  <div className="lg:col-span-3">
                                    <Label className="text-xs">Grosor mín. barras (px)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={200}
                                      className="h-8"
                                      value={(chart as AnyChart).barSizeMin ?? ""}
                                      placeholder="Auto"
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? undefined : parseInt(e.target.value) || undefined
                                        updateChart(row.id, chart.id, { barSizeMin: v } as any)
                                      }}
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">Vacío = responsive</p>
                                  </div>
                                  <div className="lg:col-span-3">
                                    <Label className="text-xs">Grosor máx. barras (px)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={200}
                                      className="h-8"
                                      value={(chart as AnyChart).barSizeMax ?? ""}
                                      placeholder="Auto"
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? undefined : parseInt(e.target.value) || undefined
                                        updateChart(row.id, chart.id, { barSizeMax: v } as any)
                                      }}
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">Vacío = responsive</p>
                                  </div>
                                  <div className="lg:col-span-6">
                                    <Label className="text-xs">Línea de referencia KPI (opcional)</Label>
                                    <Select
                                      value={(chart as AnyChart).referenceKpiId ?? "__none__"}
                                      onValueChange={(v) => updateChart(row.id, chart.id, { referenceKpiId: v === "__none__" ? undefined : v } as any)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Sin referencia" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Sin referencia</SelectItem>
                                        {kpisTyped.map((k) => (
                                          <SelectItem key={k.id} value={k.id}>
                                            {k.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground mt-1">Dibuja una línea al valor del KPI</p>
                                  </div>
                                </div>

                                {/* Espesor de filas y anchos de columna (solo para tabla) */}
                                {(chart.tipo as string) === "tabla" && (
                                  <div className="space-y-2 mt-2">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                                      <div className="lg:col-span-4">
                                        <Label className="text-xs">Espesor de filas (padding px)</Label>
                                        <Input
                                          type="number"
                                          min={2}
                                          max={24}
                                          step={1}
                                          className="h-8"
                                          value={(chart as AnyChart).tableRowHeight ?? 8}
                                          onChange={(e) =>
                                            updateChart(row.id, chart.id, { tableRowHeight: parseInt(e.target.value) || 8 } as any)
                                          }
                                          placeholder="8"
                                        />
                                        <p className="text-[11px] text-muted-foreground mt-1">2 = compacto · 8 = normal · 16 = espacioso</p>
                                      </div>
                                    </div>

                                    {/* Anchos de columna */}
                                    <div className="border rounded p-2 bg-background space-y-2">
                                      <Label className="text-xs font-medium">Ancho de columnas (px, opcional)</Label>
                                      <p className="text-[11px] text-muted-foreground">
                                        Clave: <code className="bg-muted px-1 rounded">name</code> para la columna de grupo,{" "}
                                        <code className="bg-muted px-1 rounded">value</code> para la métrica.
                                        Para multi-métrica: <code className="bg-muted px-1 rounded">campo__agg</code>.
                                      </p>
                                      {Object.entries((chart as AnyChart).columnWidths ?? {}).map(([col, width]) => (
                                        <div key={col} className="flex gap-2 items-center">
                                          <Input
                                            className="h-7 flex-1 font-mono text-xs"
                                            value={col}
                                            onChange={(e) => {
                                              const oldWidths = { ...((chart as AnyChart).columnWidths ?? {}) }
                                              const val = oldWidths[col]
                                              delete oldWidths[col]
                                              if (e.target.value) oldWidths[e.target.value] = val
                                              updateChart(row.id, chart.id, { columnWidths: oldWidths } as any)
                                            }}
                                            placeholder="nombre columna"
                                          />
                                          <Input
                                            type="number"
                                            min={40}
                                            max={800}
                                            className="h-7 w-24"
                                            value={width}
                                            onChange={(e) => {
                                              const next = { ...((chart as AnyChart).columnWidths ?? {}), [col]: parseInt(e.target.value) || 100 }
                                              updateChart(row.id, chart.id, { columnWidths: next } as any)
                                            }}
                                          />
                                          <span className="text-xs text-muted-foreground">px</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => {
                                              const next = { ...((chart as AnyChart).columnWidths ?? {}) }
                                              delete next[col]
                                              updateChart(row.id, chart.id, { columnWidths: next } as any)
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          const next = { ...((chart as AnyChart).columnWidths ?? {}), name: 200 }
                                          updateChart(row.id, chart.id, { columnWidths: next } as any)
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Agregar columna
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* KPIs como fuente de datos */}
                                {/* Colores extra por gráfico */}
                                <div className="mt-2 border-t pt-2">
                                  <Label className="text-xs font-medium">Colores adicionales</Label>
                                  <p className="text-[11px] text-muted-foreground mb-2">
                                    Se añaden al final de la paleta global para este gráfico (útil en stacked con muchas categorías).
                                  </p>
                                  <div className="flex flex-wrap gap-2 items-center">
                                    {((chart as AnyChart).extraColors ?? []).map((color, cidx) => (
                                      <div key={cidx} className="flex items-center gap-1 border rounded px-1 py-0.5">
                                        <div className="h-5 w-5 rounded border overflow-hidden shrink-0">
                                          <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                              const next = [...((chart as AnyChart).extraColors ?? [])]
                                              next[cidx] = e.target.value
                                              updateChart(row.id, chart.id, { extraColors: next } as any)
                                            }}
                                            className="h-full w-full p-0 border-0 cursor-pointer"
                                          />
                                        </div>
                                        <span className="text-xs font-mono">{color}</span>
                                        <button
                                          type="button"
                                          className="text-red-400 hover:text-red-600 text-xs"
                                          onClick={() => {
                                            const next = ((chart as AnyChart).extraColors ?? []).filter((_, i) => i !== cidx)
                                            updateChart(row.id, chart.id, { extraColors: next } as any)
                                          }}
                                        >✕</button>
                                      </div>
                                    ))}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        const next = [...((chart as AnyChart).extraColors ?? []), "#6366f1"]
                                        updateChart(row.id, chart.id, { extraColors: next } as any)
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Color
                                    </Button>
                                  </div>
                                </div>

                                {/* KPIs como fuente de datos */}
                                {kpisTyped.length > 0 && (
                                  <div className="mt-2 border-t pt-2">
                                    <Label className="text-xs font-medium">Graficar KPIs directamente</Label>
                                    <p className="text-[11px] text-muted-foreground mb-2">
                                      Activa los KPIs que quieres mostrar en este gráfico (ignora el agrupado de filas).
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {kpisTyped.map((k) => {
                                        const selected = ((chart as AnyChart).kpiIds ?? []).includes(k.id)
                                        return (
                                          <label
                                            key={k.id}
                                            className={`flex items-center gap-1.5 cursor-pointer border rounded px-2 py-1 text-xs transition-colors ${
                                              selected
                                                ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400 text-amber-800 dark:text-amber-200"
                                                : "hover:bg-muted/50"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={selected}
                                              onChange={(e) => {
                                                const current = (chart as AnyChart).kpiIds ?? []
                                                const next = e.target.checked
                                                  ? [...current, k.id]
                                                  : current.filter((id) => id !== k.id)
                                                updateChart(row.id, chart.id, { kpiIds: next } as any)
                                              }}
                                              className="h-3.5 w-3.5"
                                            />
                                            {k.nombre}
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t shrink-0">
            <DialogFooter className="flex justify-between sm:justify-between w-full">
              <Button variant="outline" onClick={handleDownloadJSON} disabled={isLoading} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar JSON
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading || availableFields.length === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}