"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getAvailableFields,
  getCampaignReportConfig,
  saveCampaignReportConfig,
  type AvailableField,
  type AvailableFilter,
} from "@/lib/api/campaignApi"

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
type KPIKind = "field" | "formula"
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
}

type ExtendedKPI = KPIDefinition & {
  kind?: KPIKind
  visible?: boolean
  formato?: KPIFormat
  unidad?: string
  decimales?: number
  columnas?: number // NUEVO: tamaño del KPI (1-12)
  formula?: {
    aKpiId: string
    op: KPIFormulaOp
    bKpiId: string
  }
}

type DashboardConstant = {
  key: string
  value: number
  label?: string
}

type BrandingConfig = {
  heroImageUrl?: string
  heroTitle?: string
  heroSubtitle?: string
  heroTextColor?: string // NUEVO: color del texto del hero
  heroImageHeight?: number // NUEVO: altura de la imagen hero en px (default 160)
  galleryPhotoFields?: string[] // NUEVO: campos que contienen fotos
  galleryMetadataFields?: string[] // NUEVO: campos a mostrar como metadata en la galería
  galleryImageHeight?: number // NUEVO: altura de las imágenes en px (default 500)
}

type FilterCondition = {
  campo: string
  operador: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith"
  valor: any
  columnas?: number // NUEVO: tamaño del filtro (1-12)
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("file_read_error"))
    reader.readAsDataURL(file)
  })
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

  const [availableFields, setAvailableFields] = useState<AvailableField[]>([])
  const [availableFilters, setAvailableFilters] = useState<AvailableFilter[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [lastImportId, setLastImportId] = useState<string | null>(null)

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
      setAvailableFields(fields ?? [])
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

  const textFields = useMemo(
    () => availableFields.filter((f) => f.type === "text" || f.type === "date" || f.type === "boolean" || f.type === "unknown"),
    [availableFields]
  )
  const numericFields = useMemo(() => availableFields.filter((f) => f.type === "number"), [availableFields])
  const allFieldNames = useMemo(() => availableFields.map((f) => f.name), [availableFields])

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
      
      // Necesitamos el companyId - lo obtenemos del campaign
      const companyId = campaign.empresaId
      const campaignId = campaign.id
      
      if (!companyId) {
        setImageStatus("❌ Error: No se encontró companyId")
        return
      }

      // Importar la función de upload dinámicamente
      const { uploadAsset } = await import("@/lib/api/campaignApi")
      
      // Subir a GCS
      const { gcsUri } = await uploadAsset({
        companyId,
        campaignId,
        file,
      })
      
      // Guardar el gsUri en el branding
      setBranding({ ...branding, heroImageUrl: gcsUri })
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
      columnas: 3, // NUEVO: default 3 columnas (4 KPIs por fila)
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

    const newRow: DashboardRow = {
      id: crypto.randomUUID(),
      orden: config.filas.length + 1,
      graficos: [],
    }

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
      opts.push({ value: `kpi:${k.id}`, label: `KPI · ${k.nombre}` })
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

              {/* Branding / Imagen */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Decoración del Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 space-y-2">
                      <Label className="text-xs">Título (opcional)</Label>
                      <Input
                        className="h-8"
                        value={branding.heroTitle ?? ""}
                        onChange={(e) => setBranding({ ...branding, heroTitle: e.target.value })}
                        placeholder="Ej: Reporte Ejecutivo"
                      />
                      
                      <Label className="text-xs">Subtítulo (opcional)</Label>
                      <Input
                        className="h-8"
                        value={branding.heroSubtitle ?? ""}
                        onChange={(e) => setBranding({ ...branding, heroSubtitle: e.target.value })}
                        placeholder="Ej: Club Colombia · Febrero"
                      />

                      {/* NUEVO: Color de texto */}
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
                      <p className="text-[11px] text-muted-foreground -mt-1">
                        Altura del hero decorativo (recomendado: 120-240px)
                      </p>
                      
                      <Label className="text-xs">Imagen por URL (opcional)</Label>
                      <Input
                        className="h-8"
                        value={branding.heroImageUrl ?? ""}
                        onChange={(e) => setBranding({ ...branding, heroImageUrl: e.target.value })}
                        placeholder="https://..."
                      />
                      
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleImageFile(f)
                          }}
                        />
                      </div>
                      {imageStatus && <p className="text-xs text-muted-foreground">{imageStatus}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        Nota: al subir un archivo se guarda como <span className="font-mono">dataURL</span> dentro del JSON.
                      </p>
                    </div>

                    <div className="lg:col-span-7">
                      <Label className="text-xs">Preview</Label>
                      <div 
                        className="mt-2 rounded-lg border overflow-hidden relative bg-muted"
                        style={{ height: `${branding.heroImageHeight || 160}px` }}
                      >
                        {branding.heroImageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={branding.heroImageUrl} alt="hero" className="absolute inset-0 h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/35" />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Sin imagen</div>
                        )}
                        <div className="relative p-4 flex flex-col justify-end h-full" style={{ color: branding.heroTextColor || "#ffffff" }}>
                          <div className="text-sm font-semibold">{branding.heroTitle || "Título del Dashboard"}</div>
                          <div className="text-xs opacity-90">{branding.heroSubtitle || "Subtítulo / contexto"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NUEVO: Configuración de Galería de Evidencias */}
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium mb-3 block">Galería de Evidencias Fotográficas</Label>
                    
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
                                  {availableFields.map((f) => (
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
                            <div key={idx} className="flex gap-2 items-center">
                              <Select
                                value={field}
                                onValueChange={(value) => {
                                  const next = [...(branding.galleryMetadataFields ?? [])]
                                  next[idx] = value
                                  setBranding({ ...branding, galleryMetadataFields: next })
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Seleccionar campo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFields.map((f) => (
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
                    constants.map((c) => (
                      <div key={c.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2">
                        <div className="md:col-span-4">
                          <Label className="text-xs">Key</Label>
                          <Input
                            className="h-8 font-mono"
                            value={c.key}
                            onChange={(e) => {
                              const nextKey = e.target.value.trim()
                              if (!nextKey) return
                              if (constants.some((x) => x.key === nextKey && x.key !== c.key)) return
                              setConstants(
                                constants.map((x) => (x.key === c.key ? { ...x, key: nextKey } : x))
                              )
                            }}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label className="text-xs">Label (opcional)</Label>
                          <Input className="h-8" value={c.label ?? ""} onChange={(e) => updateConstant(c.key, { label: e.target.value })} />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs">Value</Label>
                          <Input
                            type="number"
                            className="h-8"
                            value={Number.isFinite(c.value) ? c.value : 0}
                            onChange={(e) => updateConstant(c.key, { value: Number(e.target.value) })}
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end justify-end">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteConstant(c.key)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
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
                                  } else {
                                    const firstField = availableFields[0]
                                    updateKPI(kpi.id, {
                                      kind: "field",
                                      fuente: ((firstField?.name as any) ?? kpi.fuente) as any,
                                      operacion: firstField?.type === "number" ? ("sum" as any) : ("count" as any),
                                      countField: "__rows__",
                                      formula: undefined,
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
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="md:col-span-2">
                              <Label className="text-xs">Mostrar</Label>
                              <div className="h-8 flex items-center justify-between border rounded px-3 bg-background">
                                <span className="text-xs text-muted-foreground">Visible</span>
                                <Switch checked={kpi.visible !== false} onCheckedChange={(checked) => updateKPI(kpi.id, { visible: checked })} />
                              </div>
                            </div>

                            {/* NUEVO: Campo de columnas */}
                            <div className="md:col-span-3">
                              <Label className="text-xs">Tamaño (Cols 1-12)</Label>
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

                            <div className="md:col-span-2 flex justify-end">
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
                                    {availableFields.map((field) => (
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
                                          {availableFields.map((field) => (
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
                            <div className="md:col-span-4">
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

                            <div className="md:col-span-4">
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
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Fila {row.orden}</span>
                            <Badge variant="outline" className="text-xs">
                              {row.graficos.length}/{DEFAULT_LIMITS.maxGraficosPorFila} gráficos
                            </Badge>
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

                            const groupableFields = textFields.length ? textFields : availableFields
                            const canToggleNumeric = numericFields.length > 0

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
                                          <SelectItem key={f.name} value={f.name}>
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
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
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

                                        <div>
                                          <Label className="text-xs">Campo numérico (legacy)</Label>
                                          <Select value={String(chart.metric ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { metric: value as any, measureType: "numeric" })}>
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {numericFields.map((f) => (
                                                <SelectItem key={f.name} value={f.name}>
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
                                                <SelectItem key={f.name} value={f.name}>
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
                                                    <SelectItem key={f.name} value={f.name}>
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
                                          <SelectItem key={f.name} value={f.name}>
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