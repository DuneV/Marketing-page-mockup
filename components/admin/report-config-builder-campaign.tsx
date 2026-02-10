"use client"

import { useState, useEffect } from "react"
import {
  getAvailableFields,
  getValidOperations,
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

import { LayoutDashboard, Plus, Trash2, AlertCircle, GripVertical, Save, Palette, Download, FileText } from "lucide-react"

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
} from "@/types/report-config"

interface ReportConfigBuilderCampaignProps {
  campaign: Campaign
  onSaved?: () => void
}

// Configuración por defecto sin límites
const DEFAULT_LIMITS = {
  maxKPIs: 20,
  maxFilas: 10,
  maxGraficosPorFila: 4,
}

// Todos los tipos de gráficos disponibles
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
]

// Helpers de compatibilidad (por si tu ChartDefinition aún no tiene estos campos tipados)
type MeasureType = "count" | "numeric"
type ChartAgg = KPIOperation // sum, mean, count, max, min, median, std, variance

type MetricAxis = "left" | "right"
type MetricDef = { field: string; agg: ChartAgg; axis: MetricAxis }

type AnyChart = ChartDefinition & {
  fuente?: string
  groupBy?: string
  seriesBy?: string
  labelField?: string

  // legacy
  metric?: string
  metric2?: string
  agg?: ChartAgg
  measureType?: MeasureType
  countField?: string | "__rows__"

  // new multi metrics
  metrics?: MetricDef[]

  barOrientation?: "vertical" | "horizontal"
  barMode?: "grouped" | "stacked"
}

function validateChart(chart: AnyChart) {
  const t = chart.tipo
  const needsGroup = ["barras", "spline", "area", "radar", "heatmap", "treemap", "funnel", "tabla", "torta"].includes(t)

  if (needsGroup) {
    if (!chart.groupBy) return "Este gráfico necesita un Group By (eje X)."
  }

  if (t === "scatter") {
    if (chart.measureType !== "numeric") return "Scatter requiere métrica numérica (activa 'Usar métrica numérica')."
    if (!chart.metric || !chart.metric2) return "Scatter necesita 2 métricas (X y Y)."
  }

  const needsMetric = ["barras", "torta", "tabla", "spline", "area", "radar", "heatmap", "treemap", "funnel"].includes(t)

  if (needsMetric) {
    const mt: MeasureType = chart.measureType ?? "count"
    if (mt === "count") {
      if (!chart.countField) return "Selecciona qué campo quieres contar (o Filas)."
    } else {
      // ✅ si usa multi-métricas, con 1+ basta (y ya trae agg por métrica)
      if (Array.isArray(chart.metrics) && chart.metrics.length > 0) {
        for (const m of chart.metrics) {
          if (!m?.field) return "Hay una métrica sin campo seleccionado."
          if (!m?.agg) return "Hay una métrica sin operación (agg)."
          if (!m?.axis) return "Hay una métrica sin eje (left/right)."
        }
      } else {
        // legacy
        if (!chart.metric) return "Selecciona un campo numérico (métrica Y)."
        if (!chart.agg) return "Selecciona una operación (sum/mean/etc)."
      }
    }
  }

  if ((t as any) === "combo") {
    if (!chart.groupBy || !chart.metric || !chart.metric2) return "Combo necesita Group By + 2 métricas."
  }

  if ((t as any) === "mapa") {
    if (!(chart as any).map?.locationField || !(chart as any).map?.valueField) return "Mapa necesita ubicación y valor."
  }

  return null
}

function safeLabel(fieldName: string) {
  return (DATA_SOURCE_LABELS as any)?.[fieldName] || fieldName
}

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

  // -----------------------------
  // Helpers
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

  const loadAvailableFields = async (signal?: AbortSignal) => {
    if (!campaign?.id) return

    setIsLoadingFields(true)
    try {
      const { fields, filters, importId } = await getAvailableFields(campaign.id)
      if (signal?.aborted) return

      setAvailableFields(fields ?? [])
      setAvailableFilters(filters ?? [])
      setLastImportId(importId ?? null)

      console.log("Available fields loaded:", { campaignId: campaign.id, importId, fields, filters })
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

  const textFields = availableFields.filter((f) => f.type === "text" || f.type === "date" || f.type === "boolean" || f.type === "unknown")
  const numericFields = availableFields.filter((f) => f.type === "number")
  const allFieldNames = availableFields.map((f) => f.name)

  const getOperationsForField = (fieldName: string) => {
    const field = availableFields.find((f) => f.name === fieldName)
    if (!field) return ["count"]
    return getValidOperations(field.type)
  }

  const getNumericAggOps = () => getValidOperations("number") as string[]

  // -----------------------------
  // Load config from API (GCS) + load fields
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
  }, [
    open,
    campaign.id,
    campaign.nombre,
    campaign.empresaId,
    campaign.empresaNombre,
    campaign.fechaInicio,
    campaign.fechaFin,
  ])

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
  // KPI CRUD
  // -----------------------------
  const addKPI = () => {
    if (!config) return
    if (config.kpis.length >= DEFAULT_LIMITS.maxKPIs) {
      alert(`Límite de KPIs alcanzado (${DEFAULT_LIMITS.maxKPIs})`)
      return
    }

    const firstField = availableFields[0]
    const newKPI: KPIDefinition = {
      id: crypto.randomUUID(),
      nombre: "Nuevo KPI",
      operacion: firstField?.type === "number" ? ("sum" as KPIOperation) : ("count" as KPIOperation),
      fuente: ((firstField?.name as DataSource) ?? ("unknown" as DataSource)) as DataSource,
      // ✅ para KPIs count, por defecto cuenta filas
      countField: "__rows__",
    }

    setConfig({ ...config, kpis: [...config.kpis, newKPI] })
  }

  const updateKPI = (id: string, updates: Partial<KPIDefinition>) => {
    if (!config) return
    setConfig({
      ...config,
      kpis: config.kpis.map((kpi) => (kpi.id === id ? { ...kpi, ...updates } : kpi)),
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
  // Row / Chart CRUD
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

  // ✅ Multi-métricas CRUD
  const addMetricToChart = (rowId: string, chartId: string) => {
    if (!config) return
    const first = numericFields[0]?.name
    if (!first) return

    const chart = config.filas.find((r) => r.id === rowId)?.graficos.find((c) => c.id === chartId) as AnyChart | undefined
    const current = (chart?.metrics ?? []) as MetricDef[]

    const next: MetricDef[] = [
      ...current,
      { field: first, agg: ((current?.[0]?.agg ?? chart?.agg ?? "sum") as ChartAgg) || "sum", axis: "left" },
    ]

    updateChart(rowId, chartId, { measureType: "numeric", metrics: next } as any)
  }

  const updateMetric = (rowId: string, chartId: string, idx: number, patch: Partial<MetricDef>) => {
    if (!config) return
    const chart = config.filas.find((r) => r.id === rowId)?.graficos.find((c) => c.id === chartId) as AnyChart | undefined
    const current = (chart?.metrics ?? []) as MetricDef[]
    const next = current.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    updateChart(rowId, chartId, { metrics: next } as any)
  }

  const deleteMetric = (rowId: string, chartId: string, idx: number) => {
    if (!config) return
    const chart = config.filas.find((r) => r.id === rowId)?.graficos.find((c) => c.id === chartId) as AnyChart | undefined
    const current = (chart?.metrics ?? []) as MetricDef[]
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

    // Defaults: barras + count por filas, groupBy primer text si existe
    const defaultGroupBy = (textFields[0]?.name ?? availableFields[0]?.name ?? "") as any

    const newChart: AnyChart = {
      id: crypto.randomUUID(),
      tipo: ALL_CHART_TYPES[1] ?? ALL_CHART_TYPES[0], // barras por defecto si existe
      titulo: "Nuevo Gráfico",
      fuente: ((availableFields[0]?.name as DataSource) ?? ("unknown" as DataSource)) as DataSource,
      columnas: 6 as BootstrapCol,

      // X / group
      groupBy: defaultGroupBy || undefined,
      labelField: defaultGroupBy || undefined,

      // Y default: count rows
      measureType: "count",
      countField: "__rows__",

      // legacy numeric defaults
      agg: "sum",
      metric: numericFields[0]?.name,

      // new multi metrics defaults (vacío)
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
  // ✅ Save to API (GCS)
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
      if (localErrors.length) {
        setValidationErrors(localErrors)
        return
      }

      const tempConfig: ReportConfiguration = {
        ...config,
        id: crypto.randomUUID(),
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
      }

      const validation = reportConfigStorage.validateConfiguration(tempConfig, campaign.empresaId)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        return
      }

      await saveCampaignReportConfig(campaign.id, tempConfig)

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
  // Render
  // -----------------------------
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

        {config && (
          <DialogContent className="max-w-[90vw] sm:max-w-4xl lg:max-w-5xl max-h-[85vh] flex flex-col p-0">
            <div className="px-6 pt-6 pb-4 shrink-0">
              <DialogHeader>
                <DialogTitle>Configurar Reporte - {campaign.nombre}</DialogTitle>
                <DialogDescription>Personaliza los KPIs, gráficos y colores de la marca para esta campaña</DialogDescription>
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

                {/* Colores de Marca */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Colores de Marca
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Primario */}
                      <div className="space-y-2">
                        <Label className="text-xs">Color Primario</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={config.paletaColores?.primario || "#000000"}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  paletaColores: {
                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                    primario: e.target.value,
                                  },
                                })
                              }
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={config.paletaColores?.primario || "#000000"}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                paletaColores: {
                                  ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                  primario: e.target.value,
                                },
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Secundario */}
                      <div className="space-y-2">
                        <Label className="text-xs">Color Secundario</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={config.paletaColores?.secundario || "#ffffff"}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  paletaColores: {
                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                    secundario: e.target.value,
                                  },
                                })
                              }
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={config.paletaColores?.secundario || "#ffffff"}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                paletaColores: {
                                  ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                  secundario: e.target.value,
                                },
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Acento */}
                      <div className="space-y-2">
                        <Label className="text-xs">Color de Acento</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={config.paletaColores?.acento || "#FFB000"}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  paletaColores: {
                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                    acento: e.target.value,
                                  },
                                })
                              }
                              className="h-full w-full p-0 border-0 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={config.paletaColores?.acento || "#FFB000"}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                paletaColores: {
                                  ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                  acento: e.target.value,
                                },
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                      </div>
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

                {/* Filtros dinámicos */}
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
                        if (!config) return
                        const first = availableFilters[0]
                        const next = [...(config.filtros?.condiciones ?? [])]
                        next.push({
                          campo: first.name as any,
                          operador: ((first as any)?.operators?.[0] ?? "eq") as any,
                          valor: "",
                        })
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
                          const ops = (def as any)?.operators ?? ["eq"]

                          return (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2">
                              <div className="md:col-span-5">
                                <Label className="text-xs">Campo</Label>
                                <Select
                                  value={String(f.campo)}
                                  onValueChange={(campo) => {
                                    const d = availableFilters.find((x) => x.name === campo)
                                    const op = ((d as any)?.operators?.[0] ?? "eq") as any
                                    const next = [...(config!.filtros.condiciones ?? [])]
                                    next[idx] = { campo: campo as any, operador: op, valor: "" }
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
                                    next[idx] = { ...next[idx], operador: operador as any }
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

                              <div className="md:col-span-3">
                                <Label className="text-xs">Valor</Label>
                                <Input
                                  className="h-8"
                                  value={String(f.valor ?? "")}
                                  onChange={(e) => {
                                    const next = [...(config!.filtros.condiciones ?? [])]
                                    next[idx] = { ...next[idx], valor: e.target.value }
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
                    ) : config.kpis.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay KPIs configurados</p>
                    ) : (
                      config.kpis.map((kpi) => {
                        const validOps = getOperationsForField(kpi.fuente)
                        const fieldInfo = availableFields.find((f) => f.name === kpi.fuente)

                        return (
                          <div key={kpi.id} className="border rounded-lg p-2 sm:p-3 space-y-2 hover:bg-muted/50">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                              <div className="col-span-1 md:col-span-4">
                                <Label className="text-xs">Nombre</Label>
                                <Input value={kpi.nombre} onChange={(e) => updateKPI(kpi.id, { nombre: e.target.value })} placeholder="Nombre del KPI" className="h-8" />
                              </div>

                              <div className="col-span-1 md:col-span-4">
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
                                    const newOps = field ? getValidOperations(field.type) : ["count"]
                                    const currentOpValid = newOps.includes(kpi.operacion)
                                    const nextOp = (currentOpValid ? kpi.operacion : (newOps[0] as KPIOperation)) as KPIOperation

                                    updateKPI(kpi.id, {
                                      fuente: value as DataSource,
                                      operacion: nextOp,
                                      countField: nextOp === "count" ? ((kpi as any).countField ?? "__rows__") : undefined,
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

                              <div className="col-span-1 md:col-span-3">
                                <Label className="text-xs">Operación</Label>
                                <Select
                                  value={kpi.operacion}
                                  onValueChange={(value) => {
                                    const op = value as KPIOperation
                                    updateKPI(kpi.id, {
                                      operacion: op,
                                      countField: op === "count" ? ((kpi as any).countField ?? "__rows__") : undefined,
                                    })
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {validOps.map((op) => (
                                      <SelectItem key={op} value={op}>
                                        {KPI_OPERATION_LABELS[op as KPIOperation]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="col-span-1 md:col-span-1 flex items-end">
                                <Button variant="ghost" size="sm" onClick={() => deleteKPI(kpi.id)} className="h-8 w-8 p-0">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {kpi.operacion === "count" && (
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                <div className="col-span-1 md:col-span-8">
                                  <Label className="text-xs">Qué contar</Label>
                                  <Select value={String((kpi as any).countField ?? "__rows__")} onValueChange={(value) => updateKPI(kpi.id, { countField: value as any })}>
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
                                  <p className="text-[11px] text-muted-foreground mt-1">Filas = total registros. Campo = cuenta registros donde ese campo no está vacío.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Filas y Gráficos */}
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
                              const fieldInfo = availableFields.find((f) => f.name === chart.fuente)
                              const err = validateChart(chart)
                              const mt: MeasureType = chart.measureType ?? "count"

                              const groupableFields = textFields.length ? textFields : availableFields
                              const canToggleNumeric = numericFields.length > 0

                              const showMultiMetrics =
                                mt === "numeric" &&
                                chart.tipo !== "scatter" &&
                                ["barras", "spline", "area", "radar", "tabla", "heatmap", "treemap", "funnel"].includes(chart.tipo)

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
                                        value={chart.tipo}
                                        onValueChange={(value) => {
                                          const nextType = value as ChartType
                                          const nextUpdates: Partial<AnyChart> = { tipo: nextType }

                                          if (nextType === "scatter") {
                                            nextUpdates.measureType = "numeric"
                                            nextUpdates.agg = (chart.agg ?? "sum") as ChartAgg
                                            nextUpdates.metric = chart.metric ?? numericFields[0]?.name
                                            nextUpdates.metric2 = chart.metric2 ?? numericFields[1]?.name ?? numericFields[0]?.name
                                          }

                                          updateChart(row.id, chart.id, nextUpdates)
                                        }}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ALL_CHART_TYPES.map((tipo) => (
                                            <SelectItem key={tipo} value={tipo}>
                                              {CHART_TYPE_LABELS[tipo]}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="col-span-1 sm:col-span-3 lg:col-span-4">
                                      <Label className="text-xs">
                                        Fuente de Datos (legacy)
                                        {fieldInfo && (
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            {fieldInfo.type}
                                          </Badge>
                                        )}
                                      </Label>
                                      <Select value={chart.fuente} onValueChange={(value) => updateChart(row.id, chart.id, { fuente: value as DataSource })}>
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

                                  {/* ✅ CONFIG EJE X / Y */}
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                                    {/* X */}
                                    <div className="lg:col-span-4">
                                      <Label className="text-xs">Eje X (Group By)</Label>
                                      <Select value={chart.groupBy ?? ""} onValueChange={(value) => updateChart(row.id, chart.id, { groupBy: value, labelField: chart.labelField ?? value })}>
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
                                      <p className="text-[11px] text-muted-foreground mt-1">Categoría / dimensión (ciudad, actividad, fecha, etc.)</p>
                                    </div>

                                    {/* Toggle numeric */}
                                    <div className="lg:col-span-3">
                                      <Label className="text-xs">Métrica</Label>
                                      <div className="h-8 flex items-center justify-between border rounded px-3 bg-background">
                                        <span className="text-xs text-muted-foreground">Usar métrica numérica</span>
                                        <Switch
                                          checked={mt === "numeric"}
                                          disabled={!canToggleNumeric || chart.tipo === "scatter"}
                                          onCheckedChange={(checked) => {
                                            if (!canToggleNumeric) return

                                            if (checked) {
                                              updateChart(row.id, chart.id, {
                                                measureType: "numeric",
                                                agg: (chart.agg ?? "sum") as ChartAgg,
                                                metric: chart.metric ?? numericFields[0]?.name,
                                                countField: undefined,
                                                metrics: (chart.metrics ?? []).length ? chart.metrics : [],
                                              })
                                            } else {
                                              updateChart(row.id, chart.id, {
                                                measureType: "count",
                                                countField: chart.countField ?? "__rows__",
                                                metric: undefined,
                                                agg: undefined,
                                                metrics: [],
                                              })
                                            }
                                          }}
                                        />
                                      </div>
                                      {!canToggleNumeric && <p className="text-[11px] text-muted-foreground mt-1">No hay campos numéricos disponibles en el import.</p>}
                                    </div>

                                    {/* Y */}
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
                                        <p className="text-[11px] text-muted-foreground mt-1">Ej: X=city, Y=promoter → cuenta cuántos registros tienen ese campo por ciudad.</p>
                                      </div>
                                    ) : (
                                      <div className="lg:col-span-5">
                                        {/* ✅ legacy single metric */}
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
                                                    {KPI_OPERATION_LABELS[op as KPIOperation] ?? op}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          <div>
                                            <Label className="text-xs">Campo numérico (legacy)</Label>
                                            <Select value={String(chart.metric ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { metric: value, measureType: "numeric" })}>
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
                                            <Select value={String(chart.metric2 ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { metric2: value })}>
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

                                  {/* ✅ Multi-métricas UI */}
                                  {showMultiMetrics && (
                                    <div className="border rounded bg-background p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm font-medium">Métricas (multi-eje)</p>
                                          <p className="text-xs text-muted-foreground">Agrega todas las métricas que quieras. Cada una puede ir en eje izquierdo o derecho.</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => addMetricToChart(row.id, chart.id)} disabled={!numericFields.length}>
                                          <Plus className="h-4 w-4 mr-2" />
                                          Agregar métrica
                                        </Button>
                                      </div>

                                      {(chart.metrics ?? []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No hay métricas aún. Agrega una para que el chart renderice varias series.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {(chart.metrics ?? []).map((m, idx) => (
                                            <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-2 border rounded p-2">
                                              <div className="lg:col-span-5">
                                                <Label className="text-xs">Campo</Label>
                                                <Select value={String(m.field)} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { field: value })}>
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

                                              <div className="lg:col-span-4">
                                                <Label className="text-xs">Operación</Label>
                                                <Select value={String(m.agg ?? "sum")} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { agg: value as any })}>
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {getNumericAggOps().map((op) => (
                                                      <SelectItem key={op} value={op}>
                                                        {KPI_OPERATION_LABELS[op as KPIOperation] ?? op}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              <div className="lg:col-span-2">
                                                <Label className="text-xs">Eje</Label>
                                                <Select value={String(m.axis ?? "left")} onValueChange={(value) => updateMetric(row.id, chart.id, idx, { axis: value as any })}>
                                                  <SelectTrigger className="h-8">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="left">Left</SelectItem>
                                                    <SelectItem value="right">Right</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>

                                              <div className="lg:col-span-1 flex items-end">
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

                                  {/* Opcionales: Series / Label / orientación */}
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
                                    <div className="lg:col-span-4">
                                      <Label className="text-xs">Series (opcional)</Label>
                                      <Select value={String(chart.seriesBy ?? "")} onValueChange={(value) => updateChart(row.id, chart.id, { seriesBy: value === "__none__" ? undefined : value })}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Sin series" />
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
                                      <p className="text-[11px] text-muted-foreground mt-1">Ej: seriesBy=actividad para barras apiladas por actividad.</p>
                                    </div>

                                    <div className="lg:col-span-4">
                                      <Label className="text-xs">Label field (opcional)</Label>
                                      <Select value={String(chart.labelField ?? "__auto__")} onValueChange={(value) => updateChart(row.id, chart.id, { labelField: value === "__auto__" ? (chart.groupBy ?? undefined) : value })}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__auto__">Auto (usa Group By)</SelectItem>
                                          {availableFields.map((f) => (
                                            <SelectItem key={f.name} value={f.name}>
                                              {safeLabel(f.name)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="lg:col-span-2">
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

                                    <div className="lg:col-span-2">
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
        )}
      </Dialog>
    </TooltipProvider>
  )
}