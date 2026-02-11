"use client"

import React, { useMemo } from "react"
import type {
  ReportConfiguration,
  KPIDefinition,
  ChartDefinition,
  DashboardRow,
  KPIOperation,
  DataSource,
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

// -----------------------------
// Types
// -----------------------------
type RowData = Record<string, any>

type KPIValueMap = Record<string, number> // kpiId -> value

// -----------------------------
// Helpers: stats
// -----------------------------
function isFiniteNumber(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

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
  const v = nums.reduce((s, x) => s + (x - m) ** 2, 0) / nums.length
  return v
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
  const fmt = kpi.formato ?? "number"

  // nota: puedes ajustar locale si quieres "es-CO"
  if (fmt === "percent") {
    // asumimos que v ya viene como porcentaje (0-100) si usas op pct,
    // si no, cámbialo aquí (v * 100)
    const s = v.toFixed(dec) + "%"
    return unidad ? `${s} ${unidad}` : s
  }

  if (fmt === "currency") {
    // si unidad es "COP" / "USD" etc. intentamos usar Intl con esa moneda
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

  // number
  const s = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v)
  return unidad ? `${s} ${unidad}` : s
}

// -----------------------------
// KPI computation (field + formula)
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

function computeFormulaKpiValue(kpi: KPIDefinition, valuesById: KPIValueMap): number {
  const f = kpi.formula
  if (!f?.aKpiId || !f?.bKpiId || !f?.op) return 0
  const A = valuesById[f.aKpiId] ?? 0
  const B = valuesById[f.bKpiId] ?? 0

  switch (f.op) {
    case "add":
      return A + B
    case "sub":
      return A - B
    case "mul":
      return A * B
    case "div":
      return B === 0 ? 0 : A / B
    case "pct":
      return B === 0 ? 0 : (A / B) * 100
    default:
      return 0
  }
}

// -----------------------------
// Chart series builder
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

function seriesForChart(rows: RowData[], chart: ChartDefinition): any[] {
  const groupBy = chart.groupBy as string | undefined
  if (!groupBy) return []

  const grouped = groupRows(rows, groupBy)

  const mt = chart.measureType ?? "count"
  const metrics = chart.metrics ?? []

  const out: any[] = []
  for (const [name, bucket] of grouped.entries()) {
    const point: any = { name }

    if (mt === "count") {
      const cf = (chart.countField ?? "__rows__") as any
      point.value = countByField(bucket, cf)
    } else {
      // numeric
      if (metrics.length > 0) {
        for (const m of metrics) {
          const field = m.field as string
          const op = m.agg
          const nums: number[] = []
          for (const r of bucket) {
            const n = toNumber(r?.[field])
            if (n != null) nums.push(n)
          }
          const key = `${field}__${op}`
          point[key] = aggregateNumeric(nums, op)
        }
      } else if (chart.metric && chart.agg) {
        // legacy
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

  return out
}

// -----------------------------
// UI pieces (minimal)
// -----------------------------
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}

// -----------------------------
// Main component
// -----------------------------
export function DashboardFromConfig({
  config,
  data,
}: {
  config: ReportConfiguration
  data: RowData[]
}) {
  // 1) KPIs: compute in 2 passes (field first, then formulas)
  const { kpiValues, visibleKpis } = useMemo(() => {
    const kpis = config.kpis ?? []
    const visible = kpis.filter((k) => k.visible !== false)

    const byId: KPIValueMap = {}

    // pass 1: base field KPIs
    for (const k of kpis) {
      const kind = (k.kind ?? "field") as any
      if (kind === "formula") continue
      byId[k.id] = computeBaseKpiValue(data, k)
    }

    // pass 2: formulas
    for (const k of kpis) {
      const kind = (k.kind ?? "field") as any
      if (kind !== "formula") continue
      byId[k.id] = computeFormulaKpiValue(k, byId)
    }

    return { kpiValues: byId, visibleKpis: visible }
  }, [config.kpis, data])

  // 2) Render chart by type
  const renderChart = (chart: ChartDefinition) => {
    const tipo = chart.tipo
    const s = seriesForChart(data, chart)

    // pie: usa "value" o una única métrica
    if (tipo === "torta") {
      // Si es numeric + metrics, usamos el primer metric como value.
      let valueKey = "value"
      if ((chart.measureType ?? "count") === "numeric" && (chart.metrics?.length ?? 0) > 0) {
        const m0 = chart.metrics![0]
        valueKey = `${m0.field}__${m0.agg}`
      }

      const pieData = s.map((p) => ({
        name: p.name,
        value: Number(p[valueKey] ?? 0),
      }))

      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              label
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "barras") {
      // usamos value o primer metric
      let valueKey = "value"
      if ((chart.measureType ?? "count") === "numeric" && (chart.metrics?.length ?? 0) > 0) {
        const m0 = chart.metrics![0]
        valueKey = `${m0.field}__${m0.agg}`
      }
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={s}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={valueKey} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "spline") {
      let valueKey = "value"
      if ((chart.measureType ?? "count") === "numeric" && (chart.metrics?.length ?? 0) > 0) {
        const m0 = chart.metrics![0]
        valueKey = `${m0.field}__${m0.agg}`
      }
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={s}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={valueKey} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "area") {
      let valueKey = "value"
      if ((chart.measureType ?? "count") === "numeric" && (chart.metrics?.length ?? 0) > 0) {
        const m0 = chart.metrics![0]
        valueKey = `${m0.field}__${m0.agg}`
      }
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={s}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={valueKey} />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "scatter" || tipo === "plot") {
      const xKey = chart.metric as string | undefined
      const yKey = chart.metric2 as string | undefined
      if (!xKey || !yKey) return <div className="text-sm text-muted-foreground">Scatter requiere metric y metric2.</div>

      const pts = data
        .map((r) => ({ x: toNumber(r?.[xKey]), y: toNumber(r?.[yKey]) }))
        .filter((p) => p.x != null && p.y != null)
        .map((p) => ({ x: p.x!, y: p.y! }))

      return (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" />
            <YAxis dataKey="y" type="number" />
            <Tooltip />
            <Scatter data={pts} />
          </ScatterChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "combo") {
      const metrics = chart.metrics ?? []
      if (metrics.length < 2) return <div className="text-sm text-muted-foreground">Combo requiere >= 2 métricas.</div>

      // aseguramos que cada métrica tenga key
      const metricKeys = metrics.map((m) => ({
        key: `${m.field}__${m.agg}`,
        axis: m.axis ?? "left",
        render: m.render ?? "bar",
      }))

      return (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={s}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />

            {metricKeys.map((m, idx) => {
              const yAxisId = m.axis === "right" ? "right" : "left"
              if (m.render === "line") {
                return <Line key={idx} yAxisId={yAxisId} type="monotone" dataKey={m.key} dot={false} />
              }
              return <Bar key={idx} yAxisId={yAxisId} dataKey={m.key} />
            })}
          </ComposedChart>
        </ResponsiveContainer>
      )
    }

    if (tipo === "tabla") {
      return (
        <div className="overflow-auto">
          <table className="min-w-[480px] w-full text-sm">
            <thead>
              <tr className="border-b">
                {Object.keys(s?.[0] ?? {}).map((k) => (
                  <th key={k} className="text-left p-2 font-medium">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.map((row, i) => (
                <tr key={i} className="border-b">
                  {Object.keys(row).map((k) => (
                    <td key={k} className="p-2">{String(row[k] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return <div className="text-sm text-muted-foreground">Tipo "{tipo}" aún no implementado.</div>
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleKpis.map((kpi) => {
          const v = kpiValues[kpi.id] ?? 0
          return <Card key={kpi.id} title={kpi.nombre} value={formatKpiValue(v, kpi)} />
        })}
      </div>

      {/* Rows / charts */}
      <div className="space-y-4">
        {(config.filas ?? []).map((row: DashboardRow) => (
          <div key={row.id} className="grid grid-cols-12 gap-4">
            {(row.graficos ?? []).map((chart) => (
              <div
                key={chart.id}
                className="col-span-12 rounded-lg border bg-white p-4"
                style={{ gridColumn: `span ${chart.columnas} / span ${chart.columnas}` } as any}
              >
                <div className="mb-2 text-sm font-medium">{chart.titulo}</div>
                {renderChart(chart)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}