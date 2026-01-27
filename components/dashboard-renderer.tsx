// // components\dashboard-renderer.tsx

// "use client"

// import { useEffect, useMemo, useState } from "react"
// import type { ReportConfiguration, ChartDefinition, KPIDefinition } from "@/types/report-config"

// import {
//   ResponsiveContainer,
//   BarChart, Bar,
//   LineChart, Line,
//   PieChart, Pie, Cell,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend,
//   AreaChart, Area,
//   ScatterChart, Scatter, ZAxis,
// } from "recharts"

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"

// import { getCampaignDataset } from "@/lib/api/campaignApi"

// type Row = Record<string, any>

// function applyOperator(value: any, operator: string, expected: any) {
//   if (operator === "eq") return String(value ?? "") === String(expected ?? "")
//   if (operator === "contains") return String(value ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase())
//   if (operator === "between") {
//     // esperado: "YYYY-MM-DD|YYYY-MM-DD" o {inicio,fin} o algo que tú definas
//     // aquí lo dejo flexible: si expected viene vacío no filtra.
//     return true
//   }
//   return true
// }

// function computeKPI(rows: Row[], kpi: KPIDefinition) {
//   const values = rows.map(r => r[kpi.fuente]).filter(v => v !== null && v !== undefined)

//   if (kpi.operacion === "count") return values.length
//   const nums = values.map(v => Number(v)).filter(n => !Number.isNaN(n))
//   if (nums.length === 0) return 0

//   if (kpi.operacion === "sum") return nums.reduce((a,b)=>a+b,0)
//   if (kpi.operacion === "mean") return nums.reduce((a,b)=>a+b,0) / nums.length
//   if (kpi.operacion === "max") return Math.max(...nums)
//   if (kpi.operacion === "min") return Math.min(...nums)

//   return 0
// }

// function groupForChart(rows: Row[], chart: ChartDefinition) {
//   // Para un dashboard mínimo: agrupamos por una dimensión “natural”
//   // Ideal: chart.configuracion.xKey / yKey, pero como no lo tienes en el type,
//   // hacemos fallback:
//   const xKey = chart.configuracion?.xKey ?? "actividad"
//   const yKey = chart.configuracion?.yKey ?? chart.fuente

//   const grouped: Record<string, number> = {}
//   for (const r of rows) {
//     const x = String(r[xKey] ?? "N/A")
//     const y = Number(r[yKey] ?? 0)
//     grouped[x] = (grouped[x] ?? 0) + (Number.isNaN(y) ? 0 : y)
//   }
//   return Object.entries(grouped).map(([k, v]) => ({ [xKey]: k, [yKey]: v }))
// }

// const DEFAULT_COLORS = ["#f59e0b", "#dc2626", "#0891b2", "#10b981", "#8b5cf6", "#ec4899"]

// export function DashboardRenderer({ campaignId, config }: { campaignId: string; config: ReportConfiguration }) {
//   const [rows, setRows] = useState<Row[]>([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     ;(async () => {
//       setLoading(true)
//       try {
//         const data = await getCampaignDataset(campaignId) // 👈 implementa este endpoint
//         setRows(Array.isArray(data) ? data : [])
//       } finally {
//         setLoading(false)
//       }
//     })()
//   }, [campaignId])

//   const filteredRows = useMemo(() => {
//     const condiciones = config.filtros?.condiciones ?? []
//     if (condiciones.length === 0) return rows

//     return rows.filter((r) => {
//       return condiciones.every((c: any) => {
//         if (!c?.valor) return true // vacío = no filtra
//         return applyOperator(r[c.campo], c.operador, c.valor)
//       })
//     })
//   }, [rows, config.filtros])

//   const kpiValues = useMemo(() => {
//     const out: Record<string, number> = {}
//     for (const kpi of config.kpis ?? []) out[kpi.id] = Number(computeKPI(filteredRows, kpi) ?? 0)
//     return out
//   }, [filteredRows, config.kpis])

//   if (loading) return <div className="p-4">Cargando datos...</div>

//   return (
//     <div className="space-y-6">
//       {/* KPIs */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//         {(config.kpis ?? []).map((kpi) => (
//           <Card key={kpi.id}>
//             <CardHeader className="pb-2">
//               <CardTitle className="text-sm flex items-center justify-between">
//                 {kpi.nombre}
//                 <Badge variant="outline">{kpi.operacion}</Badge>
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold">{(kpiValues[kpi.id] ?? 0).toLocaleString()}</div>
//               <div className="text-xs text-muted-foreground mt-1">{kpi.fuente}</div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {/* Filas / Gráficos */}
//       {(config.filas ?? []).sort((a,b)=>a.orden-b.orden).map((row) => (
//         <div key={row.id} className="grid grid-cols-12 gap-4">
//           {row.graficos.map((chart) => {
//             const data = groupForChart(filteredRows, chart)
//             const col = chart.columnas ?? 12
//             const title = chart.titulo

//             return (
//               <Card key={chart.id} className={`col-span-12 md:col-span-${col}`}>
//                 <CardHeader>
//                   <CardTitle className="text-sm">{title}</CardTitle>
//                 </CardHeader>
//                 <CardContent style={{ height: 320 }}>
//                   <ResponsiveContainer width="100%" height="100%">
//                     {chart.tipo === "barras" ? (
//                       <BarChart data={data}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey={chart.configuracion?.xKey ?? "actividad"} />
//                         <YAxis />
//                         <Tooltip />
//                         <Legend />
//                         <Bar dataKey={chart.configuracion?.yKey ?? chart.fuente} fill={config.paletaColores?.acento ?? "#f59e0b"} />
//                       </BarChart>
//                     ) : chart.tipo === "spline" ? (
//                       <LineChart data={data}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey={chart.configuracion?.xKey ?? "actividad"} />
//                         <YAxis />
//                         <Tooltip />
//                         <Legend />
//                         <Line dataKey={chart.configuracion?.yKey ?? chart.fuente} stroke={config.paletaColores?.acento ?? "#f59e0b"} strokeWidth={2} />
//                       </LineChart>
//                     ) : chart.tipo === "torta" ? (
//                       <PieChart>
//                         <Pie
//                           data={data}
//                           dataKey={chart.configuracion?.yKey ?? chart.fuente}
//                           nameKey={chart.configuracion?.xKey ?? "actividad"}
//                           outerRadius={100}
//                           label
//                         >
//                           {data.map((_, idx) => (
//                             <Cell key={idx} fill={DEFAULT_COLORS[idx % DEFAULT_COLORS.length]} />
//                           ))}
//                         </Pie>
//                         <Tooltip />
//                         <Legend />
//                       </PieChart>
//                     ) : chart.tipo === "area" ? (
//                       <AreaChart data={data}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey={chart.configuracion?.xKey ?? "actividad"} />
//                         <YAxis />
//                         <Tooltip />
//                         <Legend />
//                         <Area dataKey={chart.configuracion?.yKey ?? chart.fuente} fill={config.paletaColores?.acento ?? "#f59e0b"} stroke={config.paletaColores?.acento ?? "#f59e0b"} fillOpacity={0.2} />
//                       </AreaChart>
//                     ) : chart.tipo === "scatter" || chart.tipo === "plot" ? (
//                       <ScatterChart>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey="x" name="x" />
//                         <YAxis dataKey="y" name="y" />
//                         <ZAxis dataKey="z" range={[60, 400]} />
//                         <Tooltip />
//                         <Legend />
//                         <Scatter data={filteredRows} fill={config.paletaColores?.acento ?? "#8b5cf6"} />
//                       </ScatterChart>
//                     ) : (
//                       <div className="text-sm text-muted-foreground">
//                         Tipo de gráfico no implementado aún: <b>{chart.tipo}</b>
//                       </div>
//                     )}
//                   </ResponsiveContainer>
//                 </CardContent>
//               </Card>
//             )
//           })}
//         </div>
//       ))}
//     </div>
//   )
// }
