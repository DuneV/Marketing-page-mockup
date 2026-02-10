"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis,
  ComposedChart,
} from "recharts"

import { Download, TrendingUp, Users, Activity, Eye } from "lucide-react"

import type { ReportConfiguration } from "@/types/report-config"
import { runCampaignReport, getCampaignFilterOptions } from "@/lib/api/reportRunner"
import { DashboardFiltersBar, type FilterCondition, type FilterOption } from "@/components/dashboard-filters-bar"

const COLORS = ["#f59e0b", "#dc2626", "#0891b2", "#10b981", "#8b5cf6", "#ec4899"]

type Operator =
  | "eq" | "ne"
  | "gt" | "gte" | "lt" | "lte"
  | "contains" | "startsWith" | "endsWith"
  | "in" | "between"
  | "before" | "after"

function isEmptyValor(op: Operator, v: unknown) {
  if (v === null || v === undefined) return true
  if (typeof v === "string" && v.trim() === "") return true
  if (Array.isArray(v) && v.length === 0) return true

  if (op === "between" && typeof v === "object" && v && !Array.isArray(v)) {
    const vv = v as { inicio?: string; fin?: string }
    const a = vv?.inicio
    const b = vv?.fin
    const ea = a == null || String(a).trim() === ""
    const eb = b == null || String(b).trim() === ""
    return ea && eb
  }

  return false
}

const KPI_ICONS = {
  ventas: TrendingUp,
  impulsos: Users,
  promedio: Activity,
  conversion: Eye,
} as const

type MetricAxis = "left" | "right"
type MetricRender = "bar" | "line"

type MetricField = { field: string; axis: MetricAxis; render?: MetricRender }

function pickMetricFields(ch: unknown, data: unknown[]): MetricField[] {
  const chart = ch as any

  // 1) Nuevo: metrics[]
  if (Array.isArray(chart?.metrics) && chart.metrics.length > 0) {
    return chart.metrics.map((m: any) => ({
      field: String(m.field),
      axis: (m.axis === "right" ? "right" : "left") as MetricAxis,
      render: (m.render === "line" ? "line" : m.render === "bar" ? "bar" : undefined) as MetricRender | undefined,
    }))
  }

  // 2) legacy numeric: metric
  if (chart?.measureType === "numeric" && chart?.metric) {
    return [{ field: String(chart.metric), axis: "left" as const }]
  }

  // 3) count default: value
  const first = data?.[0] as any
  if (first && typeof first === "object" && "value" in first) {
    return [{ field: "value", axis: "left" as const }]
  }

  // 4) fallback: keys numéricas
  if (!first || typeof first !== "object") return []
  return Object.keys(first)
    .filter((k) => !["name", "date", "series", "__axis__"].includes(k))
    .map((k) => ({ field: k, axis: "left" as const }))
}

type FormulaOp = "add" | "sub" | "mul" | "div" | "pct"
type KPIKind = "field" | "formula"
type ExtendedKPI = {
  id: string
  nombre: string
  kind?: KPIKind
  formula?: { aKpiId: string; op: FormulaOp; bKpiId: string }
}

function safeDiv(a: number, b: number) {
  if (!Number.isFinite(a)) return 0
  if (!Number.isFinite(b) || b === 0) return 0
  return a / b
}

export function DashboardFromConfig({ config }: { config: ReportConfiguration }) {
  const [result, setResult] = useState<null | {
    kpis: Record<string, { id: string; nombre: string; value: number }>
    charts: Record<string, any[]>
    rowCount: number
  }>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([])

  const initialConditions = useMemo<FilterCondition[]>(() => {
    const cs = (config?.filtros?.condiciones ?? []) as any[]
    return cs.map((c) => ({
      campo: String(c?.campo ?? ""),
      operador: (c?.operador ?? "eq") as Operator,
      valor: (c?.operador === "between") ? { inicio: "", fin: "" } : "",
      label: c?.label,
    }))
  }, [config])

  const [uiConditions, setUiConditions] = useState<FilterCondition[]>(initialConditions)

  useEffect(() => {
    setUiConditions(initialConditions)
  }, [initialConditions])

  function setValor(idx: number, nextValor: unknown) {
    setUiConditions((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], valor: nextValor }
      return copy
    })
  }

  async function run(aplicar: boolean) {
    setLoading(true)
    setError(null)
    try {
      const condicionesParaBackend = aplicar
        ? uiConditions.filter((c) => {
            if (!c?.campo || !c?.operador) return false
            if (isEmptyValor(c.operador as Operator, c.valor)) return false
            return true
          })
        : []

      const payload: any = {
        ...config,
        filtros: {
          ...(config.filtros ?? {}),
          aplicar,
          condiciones: condicionesParaBackend,
        },
      }

      const r = await runCampaignReport(config.campaignId, payload)
      setResult(r)
    } catch (e: any) {
      console.error("Error en run:", e)
      setError(e?.message ?? "Error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run(false)
    loadFilterOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId])

  async function loadFilterOptions() {
    if (!initialConditions.length) return

    try {
      const fields = initialConditions.map((c) => c.campo).filter(Boolean)
      if (!fields.length) return

      const r = await getCampaignFilterOptions(config.campaignId, fields)

      const formatted: FilterOption[] = Object.entries(r.options ?? {}).map(([campo, opts]) => ({
        campo,
        options: (opts ?? []).map((o: any) => ({
          value: String(o.value ?? o),
          label: String(o.label ?? o.value ?? o),
        })),
      }))

      setFilterOptions(formatted)
    } catch (e: any) {
      console.error("❌ Error loading filter options:", e)
      setFilterOptions([])
    }
  }

  // -----------------------------
  // ✅ KPIs: base + fórmula
  // -----------------------------
  const kpiCards = useMemo(() => {
    if (!result) return []
    const kpis = (config.kpis ?? []) as unknown as ExtendedKPI[]

    const baseValues: Record<string, number> = {}
    for (const k of (config.kpis ?? []) as any[]) {
      baseValues[k.id] = Number(result.kpis?.[k.id]?.value ?? 0)
    }

    const computedValues: Record<string, number> = { ...baseValues }
    for (const k of kpis) {
      const kind = (k.kind ?? "field") as KPIKind
      if (kind !== "formula") continue

      const a = computedValues[k.formula?.aKpiId ?? ""] ?? 0
      const b = computedValues[k.formula?.bKpiId ?? ""] ?? 0
      const op = k.formula?.op

      let v = 0
      if (op === "add") v = a + b
      else if (op === "sub") v = a - b
      else if (op === "mul") v = a * b
      else if (op === "div") v = safeDiv(a, b)
      else if (op === "pct") v = safeDiv(a, b) * 100

      computedValues[k.id] = v
    }

    return kpis.map((k) => ({
      id: k.id,
      nombre: k.nombre,
      value: computedValues[k.id] ?? 0,
    }))
  }, [config.kpis, result])

  const handlePrint = () => window.print()

  if (loading && !result) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error && !result) {
    return (
      <div className="p-6 rounded-lg border border-destructive bg-destructive/10">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-4">
        <>
          <style>{`
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
            }
          `}</style>

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {config.campaignNombre || "Dashboard de Activaciones"}
              </h1>
              {config.empresaNombre && (
                <p className="text-sm text-muted-foreground mt-1">{config.empresaNombre}</p>
              )}
            </div>
            <div className="flex gap-3 no-print">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:scale-105 bg-primary text-primary-foreground"
              >
                <Download size={20} />
                Generar Reporte
              </button>
            </div>
          </div>

          {/* Filtros */}
          {uiConditions.length > 0 && (
            <DashboardFiltersBar
              conditions={uiConditions}
              filterOptions={filterOptions}
              loading={loading}
              error={error}
              onApply={() => run(true)}
              onClear={() => {
                setUiConditions(initialConditions)
                run(false)
              }}
              onChangeValor={setValor}
            />
          )}

          {/* KPI Cards */}
          {kpiCards.length > 0 && (
            <section className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {kpiCards.map((kpi, idx) => {
                  const IconComponent = Object.values(KPI_ICONS)[idx % Object.keys(KPI_ICONS).length]
                  return (
                    <div key={kpi.id} className="p-6 rounded-xl bg-card border border-border shadow-md">
                      <div className="mb-3">
                        <div className="inline-flex p-3 rounded-lg bg-primary text-primary-foreground">
                          <IconComponent size={22} />
                        </div>
                      </div>

                      <p className="text-sm font-medium text-muted-foreground uppercase">{kpi.nombre}</p>
                      <p className="text-3xl font-bold mt-1">
                        {Number(kpi.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Filas de Gráficos */}
          {(config.filas ?? [])
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((row) => (
              <section key={row.id} className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {row.graficos.map((ch: any) => {
                    const data: any[] = result.charts?.[ch.id] ?? []
                    const colSpan =
                      ch.columnas === 12 ? "lg:col-span-12" :
                      ch.columnas === 6 ? "lg:col-span-6" :
                      ch.columnas === 4 ? "lg:col-span-4" :
                      ch.columnas === 3 ? "lg:col-span-3" :
                      "lg:col-span-6"

                    return (
                      <div key={ch.id} className={`p-6 rounded-lg shadow-lg bg-card border border-border ${colSpan}`}>
                        <h3 className="text-xl font-bold mb-4 text-card-foreground">{ch.titulo}</h3>

                        {/* ✅ COMBO (Bar + Line) */}
                        {String(ch.tipo) === "combo" && (() => {
                          const metrics = pickMetricFields(ch, data)
                          // por defecto: si no trae render, la 1ra bar y el resto line
                          const normalized = metrics.map((m, i) => ({
                            ...m,
                            render: m.render ?? (i === 0 ? "bar" : "line"),
                          }))

                          return (
                            <ResponsiveContainer width="100%" height={320}>
                              <ComposedChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis yAxisId="left" stroke="#888" />
                                <YAxis yAxisId="right" orientation="right" stroke="#888" />
                                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                                <Legend />

                                {normalized.map((m, idx) => {
                                  const key = `${m.field}-${m.render}-${m.axis}`
                                  if (m.render === "bar") {
                                    return (
                                      <Bar
                                        key={key}
                                        dataKey={m.field}
                                        fill={COLORS[idx % COLORS.length]}
                                        name={m.field}
                                        yAxisId={m.axis}
                                        stackId={(ch as any).barMode === "stacked" ? "stack" : undefined}
                                      />
                                    )
                                  }
                                  return (
                                    <Line
                                      key={key}
                                      type="monotone"
                                      dataKey={m.field}
                                      stroke={COLORS[idx % COLORS.length]}
                                      strokeWidth={2}
                                      name={m.field}
                                      yAxisId={m.axis}
                                    />
                                  )
                                })}
                              </ComposedChart>
                            </ResponsiveContainer>
                          )
                        })()}

                        {/* BARRAS (multi-métricas + seriesBy) */}
                        {ch.tipo === "barras" && (() => {
                          const metrics = pickMetricFields(ch, data)
                          const hasSeries = data?.[0] && typeof data[0] === "object" && "series" in data[0]

                          if (hasSeries) {
                            const m0 = metrics[0]?.field ?? "value"
                            const pivot: Record<string, any> = {}
                            for (const r of data) {
                              const n = String((r as any).name ?? "N/A")
                              const s = String((r as any).series ?? "N/A")
                              pivot[n] ??= { name: n }
                              pivot[n][s] = Number((r as any)[m0] ?? 0)
                            }
                            const pivoted = Object.values(pivot)
                            const seriesKeys = Array.from(new Set(data.map((r: any) => String(r.series ?? "N/A"))))

                            return (
                              <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={pivoted}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                  <XAxis dataKey="name" stroke="#888" />
                                  <YAxis yAxisId="left" stroke="#888" />
                                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                                  <Legend />
                                  {seriesKeys.map((s, idx: number) => (
                                    <Bar
                                      key={s}
                                      dataKey={s}
                                      fill={COLORS[idx % COLORS.length]}
                                      name={s}
                                      yAxisId="left"
                                      stackId={(ch as any).barMode === "stacked" ? "stack" : undefined}
                                    />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            )
                          }

                          return (
                            <ResponsiveContainer width="100%" height={320}>
                              <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="name" stroke="#888" />
                                <YAxis yAxisId="left" stroke="#888" />
                                <YAxis yAxisId="right" orientation="right" stroke="#888" />
                                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                                <Legend />
                                {metrics.map((m: MetricField, idx: number) => (
                                  <Bar
                                    key={m.field}
                                    dataKey={m.field}
                                    fill={COLORS[idx % COLORS.length]}
                                    name={m.field}
                                    yAxisId={m.axis}
                                    stackId={(ch as any).barMode === "stacked" ? "stack" : undefined}
                                  />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          )
                        })()}

                        {/* TORTA */}
                        {ch.tipo === "torta" && (
                          <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {data.map((_: any, idx: number) => (
                                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        )}

                        {/* SPLINE */}
                        {ch.tipo === "spline" && (
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis dataKey="date" stroke="#888" />
                              <YAxis yAxisId="left" stroke="#888" />
                              <YAxis yAxisId="right" orientation="right" stroke="#888" />
                              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                              <Legend />
                              {pickMetricFields(ch, data).map((m: MetricField, idx: number) => (
                                <Line
                                  key={m.field}
                                  type="monotone"
                                  dataKey={m.field}
                                  stroke={COLORS[idx % COLORS.length]}
                                  strokeWidth={2}
                                  name={m.field}
                                  yAxisId={m.axis}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        )}

                        {/* AREA */}
                        {ch.tipo === "area" && (
                          <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis dataKey="date" stroke="#888" />
                              <YAxis yAxisId="left" stroke="#888" />
                              <YAxis yAxisId="right" orientation="right" stroke="#888" />
                              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                              <Legend />
                              {pickMetricFields(ch, data).map((m: MetricField, idx: number) => (
                                <Area
                                  key={m.field}
                                  type="monotone"
                                  dataKey={m.field}
                                  fill={COLORS[idx % COLORS.length]}
                                  stroke={COLORS[idx % COLORS.length]}
                                  fillOpacity={0.2}
                                  strokeWidth={2}
                                  name={m.field}
                                  yAxisId={m.axis}
                                  stackId={(ch as any).barMode === "stacked" ? "stack" : undefined}
                                />
                              ))}
                            </AreaChart>
                          </ResponsiveContainer>
                        )}

                        {/* RADAR */}
                        {ch.tipo === "radar" && (
                          <ResponsiveContainer width="100%" height={320}>
                            <RadarChart data={data}>
                              <PolarGrid stroke="#444" />
                              <PolarAngleAxis dataKey="name" stroke="#888" />
                              <PolarRadiusAxis stroke="#888" />
                              <Legend />
                              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                              {pickMetricFields(ch, data).map((m: MetricField, idx: number) => (
                                <Radar
                                  key={m.field}
                                  name={m.field}
                                  dataKey={m.field}
                                  stroke={COLORS[idx % COLORS.length]}
                                  fill={COLORS[idx % COLORS.length]}
                                  fillOpacity={0.2}
                                />
                              ))}
                            </RadarChart>
                          </ResponsiveContainer>
                        )}

                        {/* SCATTER */}
                        {ch.tipo === "scatter" && (
                          <ResponsiveContainer width="100%" height={320}>
                            <ScatterChart>
                              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                              <XAxis dataKey="x" name="X" stroke="#888" />
                              <YAxis dataKey="y" name="Y" stroke="#888" />
                              <ZAxis dataKey="z" range={[100, 1000]} name="Tamaño" />
                              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1f2937" }} />
                              <Legend />
                              <Scatter name="Datos" data={data} fill={COLORS[4]} />
                            </ScatterChart>
                          </ResponsiveContainer>
                        )}

                        {/* TABLA */}
                        {ch.tipo === "tabla" && (
                          <div className="overflow-auto max-h-[320px]">
                            <table className="w-full text-sm">
                              <thead className="bg-muted sticky top-0">
                                <tr>
                                  {data[0] && Object.keys(data[0]).filter((k) => k !== "__axis__").map((key: string) => (
                                    <th key={key} className="px-4 py-2 text-left font-medium">{key}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {data.map((row: any, idx: number) => {
                                  const keys = Object.keys(row).filter((k) => k !== "__axis__")
                                  return (
                                    <tr key={idx} className="border-t border-border">
                                      {keys.map((k: string) => (
                                        <td key={k} className="px-4 py-2">
                                          {typeof row[k] === "number" ? Number(row[k]).toLocaleString() : String(row[k])}
                                        </td>
                                      ))}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {!(["barras", "torta", "spline", "area", "radar", "scatter", "tabla", "combo"] as string[]).includes(String(ch.tipo)) && (
                          <div className="text-sm text-muted-foreground">
                            Tipo de gráfico <strong>{String(ch.tipo)}</strong> aún no implementado. Dataset: {data.length} filas.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

          {/* Footer */}
          {result.rowCount !== undefined && (
            <section className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground text-center">
                Dashboard generado con <strong>{result.rowCount}</strong> registros
                {config.filtros?.fechas && (
                  <> • Período: {config.filtros.fechas.inicio} - {config.filtros.fechas.fin}</>
                )}
              </p>
            </section>
          )}
        </>
      </div>
    </div>
  )
}