// components/dashboard-from-config.tsx

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
  ComposedChart
} from "recharts"

import { Download, TrendingUp, Users, Activity, Eye, Filter } from "lucide-react"

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

function isEmptyValor(op: Operator, v: any) {
  // Valores claramente vacíos
  if (v === null || v === undefined) return true
  
  // String vacío o solo espacios
  if (typeof v === "string" && v.trim() === "") return true
  
  // Array vacío
  if (Array.isArray(v) && v.length === 0) return true
  
  // Objeto between con ambos campos vacíos
  if (op === "between" && typeof v === "object" && v && !Array.isArray(v)) {
    const a = v?.inicio
    const b = v?.fin
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

  // Filtros UI
  const initialConditions = useMemo<FilterCondition[]>(() => {
    const cs = (config?.filtros?.condiciones ?? []) as any[]
    return cs.map(c => ({
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

  function setValor(idx: number, nextValor: any) {
    setUiConditions(prev => {
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
      ? uiConditions.filter(c => {
          // Filtrar condiciones que tienen campo y operador válidos
          if (!c?.campo || !c?.operador) return false
          
          // Filtrar condiciones con valores vacíos
          if (isEmptyValor(c.operador as any, c.valor)) return false
          
          return true
        })
      : []

    console.log("🔍 Condiciones a enviar:", condicionesParaBackend)

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

  // Cargar opciones de filtros usando Server Action

  async function loadFilterOptions() {
    if (!initialConditions.length) return

    try {
      const fields = initialConditions.map(c => c.campo).filter(Boolean)
      if (!fields.length) return

      console.log("📊 Loading filter options for fields:", fields)

      const result = await getCampaignFilterOptions(config.campaignId, fields)

      console.log("Filter options received:", result.options)

      const formatted: FilterOption[] = Object.entries(result.options ?? {}).map(([campo, opts]) => ({
        campo,
        options: (opts ?? []).map((o: any) => ({
          value: String(o.value ?? o),
          label: String(o.label ?? o.value ?? o),
        })),
      }))

      setFilterOptions(formatted)
      console.log("✅ Filter options set:", formatted.length, "fields")
    } catch (e: any) {
      console.error("❌ Error loading filter options:", e)
      setFilterOptions([])
    }
  }


  const kpiCards = useMemo(() => {
    if (!result) return []
    return (config.kpis ?? []).map(k => ({
      id: k.id,
      nombre: k.nombre,
      value: result.kpis?.[k.id]?.value ?? 0,
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
      {/* TODO tu contenido actual va aquí */}
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
            const IconComponent =
              Object.values(KPI_ICONS)[idx % Object.keys(KPI_ICONS).length]

            return (
              <div
                key={kpi.id}
                className="p-6 rounded-xl bg-card border border-border shadow-md"
              >
                <div className="mb-3">
                  <div className="inline-flex p-3 rounded-lg bg-primary text-primary-foreground">
                    <IconComponent size={22} />
                  </div>
                </div>

                <p className="text-sm font-medium text-muted-foreground uppercase">
                  {kpi.nombre}
                </p>

                <p className="text-3xl font-bold mt-1">
                  {Number(kpi.value).toLocaleString()}
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
        .map(row => (
          <section key={row.id} className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {row.graficos.map(ch => {
                const data = result.charts?.[ch.id] ?? []
                const colSpan =
                  ch.columnas === 12 ? "lg:col-span-12" :
                  ch.columnas === 6 ? "lg:col-span-6" :
                  ch.columnas === 4 ? "lg:col-span-4" :
                  ch.columnas === 3 ? "lg:col-span-3" :
                  "lg:col-span-6"

                return (
                  <div
                    key={ch.id}
                    className={`p-6 rounded-lg shadow-lg bg-card border border-border ${colSpan}`}
                  >
                    <h3 className="text-xl font-bold mb-4 text-card-foreground">
                      {ch.titulo}
                    </h3>

                    {ch.tipo === "barras" && (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis dataKey="name" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              color: "#1f2937",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" fill={COLORS[0]} name="Valor" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {ch.tipo === "torta" && (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie 
                            data={data} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={100} 
                            label
                          >
                            {data.map((_: any, idx: number) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              color: "#1f2937",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}

                    {ch.tipo === "spline" && (
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis dataKey="date" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              color: "#1f2937",
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={COLORS[0]} 
                            strokeWidth={2} 
                            name="Valor"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}

                    {ch.tipo === "area" && (
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis dataKey="date" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              color: "#1f2937",
                            }}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            fill={COLORS[0]} 
                            stroke={COLORS[0]} 
                            fillOpacity={0.25} 
                            strokeWidth={2}
                            name="Valor"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {ch.tipo === "radar" && (
                      <ResponsiveContainer width="100%" height={320}>
                        <RadarChart data={data}>
                          <PolarGrid stroke="#444" />
                          <PolarAngleAxis dataKey="name" stroke="#888" />
                          <PolarRadiusAxis stroke="#888" />
                          <Radar 
                            name="Valor" 
                            dataKey="value" 
                            stroke={COLORS[0]} 
                            fill={COLORS[0]} 
                            fillOpacity={0.3} 
                          />
                          <Legend />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              color: "#1f2937",
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}

                    {ch.tipo === "scatter" && (
                      <ResponsiveContainer width="100%" height={320}>
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis dataKey="x" name="X" stroke="#888" />
                          <YAxis dataKey="y" name="Y" stroke="#888" />
                          <ZAxis dataKey="z" range={[100, 1000]} name="Tamaño" />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e5e7eb",
                              color: "#1f2937",
                            }}
                          />
                          <Legend />
                          <Scatter name="Datos" data={data} fill={COLORS[4]} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    )}

                    {ch.tipo === "tabla" && (
                      <div className="overflow-auto max-h-[320px]">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              {data[0] && Object.keys(data[0]).map((key) => (
                                <th key={key} className="px-4 py-2 text-left font-medium">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((row: any, idx: number) => (
                              <tr key={idx} className="border-t border-border">
                                {Object.values(row).map((val: any, i: number) => (
                                  <td key={i} className="px-4 py-2">
                                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!(["barras", "torta", "spline", "area", "radar", "scatter", "tabla"] as string[]).includes(ch.tipo) && (
                      <div className="text-sm text-muted-foreground">
                        Tipo de gráfico <strong>{ch.tipo}</strong> aún no implementado. 
                        Dataset: {data.length} filas.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

      {/* Footer con información */}
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