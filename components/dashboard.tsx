// components/dashboard.tsx

"use client"

import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Area,
} from "recharts"
import { Calendar, MapPin, Activity, Download, Eye, Users, TrendingUp } from "lucide-react"
import type { ViewType } from "@/components/app-sidebar"
import { CompanyComments } from "@/components/company-comments"
import { PeopleMonitoring } from "@/components/people-monitoring"
import { EmployeeCampaignView } from "@/components/employee-campaign-view"

// npm i react-simple-maps
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"

// IMPULSO: ventas 822, impulsos 45
// SAMPLING: ventas 1587, impulsos 69
// MICHELADA: ventas 3210, impulsos 62
const rawData = [
  // IMPULSO (822 / 45)
  { fecha: "31/10/2025", ciudad: "ARMENIA", actividad: "IMPULSO", ventas: 120, impulsos: 6, promotoras: 1 },
  { fecha: "31/10/2025", ciudad: "BARRANQUILLA", actividad: "IMPULSO", ventas: 210, impulsos: 12, promotoras: 4 },
  { fecha: "31/10/2025", ciudad: "CALI", actividad: "IMPULSO", ventas: 160, impulsos: 9, promotoras: 3 },
  { fecha: "31/10/2025", ciudad: "MEDELLIN", actividad: "IMPULSO", ventas: 152, impulsos: 8, promotoras: 3 },
  { fecha: "31/10/2025", ciudad: "BOGOTA", actividad: "IMPULSO", ventas: 180, impulsos: 10, promotoras: 5 },

  // SAMPLING (1587 / 69)
  { fecha: "05/06/2025", ciudad: "BOGOTA", actividad: "SAMPLING", ventas: 520, impulsos: 22, promotoras: 6 },
  { fecha: "06/06/2025", ciudad: "BOGOTA", actividad: "SAMPLING", ventas: 430, impulsos: 18, promotoras: 5 },
  { fecha: "30/05/2025", ciudad: "PEREIRA", actividad: "SAMPLING", ventas: 320, impulsos: 14, promotoras: 3 },
  { fecha: "05/06/2025", ciudad: "BUCARAMANGA", actividad: "SAMPLING", ventas: 317, impulsos: 15, promotoras: 3 },

  // MICHELADA (3210 / 62)
  { fecha: "11/10/2025", ciudad: "BOGOTA", actividad: "MICHELADA", ventas: 980, impulsos: 19, promotoras: 6 },
  { fecha: "17/10/2025", ciudad: "BOGOTA", actividad: "MICHELADA", ventas: 860, impulsos: 16, promotoras: 6 },
  { fecha: "24/10/2025", ciudad: "CHIA", actividad: "MICHELADA", ventas: 540, impulsos: 11, promotoras: 2 },
  { fecha: "25/10/2025", ciudad: "TUNJA", actividad: "MICHELADA", ventas: 830, impulsos: 16, promotoras: 3 },
]

interface DashboardProps {
  activeView: ViewType
  userType: "employee" | "company"
}

export default function Dashboard({ activeView, userType }: DashboardProps) {
  const [filters, setFilters] = useState({
    actividad: "all",
    fecha: "all",
    ciudad: "all",
  })

  // Obtener opciones únicas para filtros
  const actividades = useMemo(() => [...new Set(rawData.map((d) => d.actividad))], [])
  const ciudades = useMemo(() => [...new Set(rawData.map((d) => d.ciudad))], [])
  const fechas = useMemo(() => [...new Set(rawData.map((d) => d.fecha))].sort(), [])

  // Filtrar datos
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      const matchActividad = filters.actividad === "all" || item.actividad === filters.actividad
      const matchCiudad = filters.ciudad === "all" || item.ciudad === filters.ciudad
      const matchFecha = filters.fecha === "all" || item.fecha === filters.fecha
      return matchActividad && matchCiudad && matchFecha
    })
  }, [filters])

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalVentas = filteredData.reduce((sum, item) => sum + item.ventas, 0)
    const totalImpulsos = filteredData.reduce((sum, item) => sum + item.impulsos, 0)
    const promedioVentas = filteredData.length > 0 ? Math.round(totalVentas / filteredData.length) : 0
    const tasaConversion =
      filteredData.length > 0 ? ((totalVentas / (totalImpulsos * 100)) * 100).toFixed(1) : 0

    return {
      ventas: totalVentas,
      impulsos: totalImpulsos,
      promedio: promedioVentas,
      conversion: tasaConversion,
    }
  }, [filteredData])

  // Datos para gráficos
  const actividadData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.actividad]) {
        acc[item.actividad] = { actividad: item.actividad, ventas: 0, impulsos: 0 }
      }
      acc[item.actividad].ventas += item.ventas
      acc[item.actividad].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
  }, [filteredData])

  const ciudadData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.ciudad]) {
        acc[item.ciudad] = { ciudad: item.ciudad, ventas: 0, impulsos: 0, promotoras: 0 }
      }
      acc[item.ciudad].ventas += item.ventas
      acc[item.ciudad].impulsos += item.impulsos
      acc[item.ciudad].promotoras += item.promotoras
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped).sort((a: any, b: any) => b.ventas - a.ventas)
  }, [filteredData])

  // Comparación de ciudades por actividad
  const ciudadActividadComparison = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const key = `${item.ciudad}-${item.actividad}`
      if (!acc[key]) {
        acc[key] = { ciudad: item.ciudad, actividad: item.actividad, ventas: 0, impulsos: 0 }
      }
      acc[key].ventas += item.ventas
      acc[key].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
  }, [filteredData])

  // Tendencia temporal
  const timelineData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.fecha]) {
        acc[item.fecha] = { fecha: item.fecha, ventas: 0, impulsos: 0 }
      }
      acc[item.fecha].ventas += item.ventas
      acc[item.fecha].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped).sort((a: any, b: any) => {
      const [dayA, monthA, yearA] = a.fecha.split("/").map(Number)
      const [dayB, monthB, yearB] = b.fecha.split("/").map(Number)
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime()
    })
  }, [filteredData])

  // Eficiencia por ciudad (ventas por promotora)
  const ciudadEfficiency = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.ciudad]) {
        acc[item.ciudad] = { ciudad: item.ciudad, ventas: 0, promotoras: 0 }
      }
      acc[item.ciudad].ventas += item.ventas
      acc[item.ciudad].promotoras += item.promotoras
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        eficiencia: item.promotoras > 0 ? Math.round(item.ventas / item.promotoras) : 0,
      }))
      .sort((a: any, b: any) => b.eficiencia - a.eficiencia)
      .slice(0, 10)
  }, [filteredData])

  // Scatter plot: Impulsos vs Ventas por ciudad
  const scatterData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.ciudad]) {
        acc[item.ciudad] = { ciudad: item.ciudad, totalVentas: 0, totalImpulsos: 0, eventos: 0 }
      }
      acc[item.ciudad].totalVentas += item.ventas
      acc[item.ciudad].totalImpulsos += item.impulsos
      acc[item.ciudad].eventos += 1
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped).map((item: any) => ({
      ciudad: item.ciudad,
      x: item.totalImpulsos,
      y: item.totalVentas,
      z: item.eventos * 100,
    }))
  }, [filteredData])

  // Radar chart: Comparación múltiple de ciudades top
  const radarData = useMemo(() => {
    const topCiudades = ciudadData.slice(0, 5)
    return [
      { metric: "Ventas", ...topCiudades.reduce((acc, c: any) => ({ ...acc, [c.ciudad]: c.ventas / 1000 }), {}) },
      { metric: "Impulsos", ...topCiudades.reduce((acc, c: any) => ({ ...acc, [c.ciudad]: c.impulsos }), {}) },
      { metric: "Promotoras", ...topCiudades.reduce((acc, c: any) => ({ ...acc, [c.ciudad]: c.promotoras * 10 }), {}) },
    ]
  }, [ciudadData])

  // =========================
  // ✅ GRAFICAS ADICIONALES
  // =========================

  // 1) Stacked por ciudad: ventas por tipo (IMPULSO/SAMPLING/MICHELADA)
  const stackedCityByType = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.ciudad]) {
        acc[item.ciudad] = { ciudad: item.ciudad, IMPULSO: 0, SAMPLING: 0, MICHELADA: 0 }
      }
      acc[item.ciudad][item.actividad] += item.ventas
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped).sort((a: any, b: any) => {
      const totalA = a.IMPULSO + a.SAMPLING + a.MICHELADA
      const totalB = b.IMPULSO + b.SAMPLING + b.MICHELADA
      return totalB - totalA
    })
  }, [filteredData])

  // 2) Rendimiento por tipo: ventas por impulso (ratio)
  const rendimientoPorTipo = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.actividad]) {
        acc[item.actividad] = { actividad: item.actividad, ventas: 0, impulsos: 0 }
      }
      acc[item.actividad].ventas += item.ventas
      acc[item.actividad].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped).map((r: any) => ({
      ...r,
      ventasPorImpulso: r.impulsos > 0 ? Number((r.ventas / r.impulsos).toFixed(2)) : 0,
    }))
  }, [filteredData])

  // 3) Rendimiento por ciudad: ventas por impulso (ratio)
  const rendimientoPorCiudad = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.ciudad]) {
        acc[item.ciudad] = { ciudad: item.ciudad, ventas: 0, impulsos: 0 }
      }
      acc[item.ciudad].ventas += item.ventas
      acc[item.ciudad].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)
    return Object.values(grouped)
      .map((r: any) => ({
        ...r,
        ventasPorImpulso: r.impulsos > 0 ? Number((r.ventas / r.impulsos).toFixed(2)) : 0,
      }))
      .sort((a: any, b: any) => b.ventasPorImpulso - a.ventasPorImpulso)
  }, [filteredData])

  // 4) “Heatmap” tipo matriz (ciudad vs actividad) usando scatter en ejes categóricos
  //    (se ve como mapa de calor: tamaño del punto = ventas, tooltip con detalles)
  const heatmapCityType = useMemo(() => {
    const cities = [...new Set(filteredData.map((d) => d.ciudad))]
    const types = ["IMPULSO", "SAMPLING", "MICHELADA"]

    const grouped = filteredData.reduce((acc, item) => {
      const key = `${item.ciudad}-${item.actividad}`
      if (!acc[key]) acc[key] = { ciudad: item.ciudad, actividad: item.actividad, ventas: 0, impulsos: 0 }
      acc[key].ventas += item.ventas
      acc[key].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)

    return {
      cities,
      types,
      points: Object.values(grouped).map((p: any) => ({
        x: p.actividad, // categórico
        y: p.ciudad, // categórico
        z: Math.max(60, p.ventas), // tamaño (mínimo para que se vea)
        ventas: p.ventas,
        impulsos: p.impulsos,
      })),
    }
  }, [filteredData])

  // 5) Top ciudades por cada tipo (ranking)
  const topCiudadesPorTipo = useMemo(() => {
    const types = ["IMPULSO", "SAMPLING", "MICHELADA"]
    const res = types.map((t) => {
      const grouped = filteredData
        .filter((d) => d.actividad === t)
        .reduce((acc, item) => {
          if (!acc[item.ciudad]) acc[item.ciudad] = { ciudad: item.ciudad, ventas: 0, impulsos: 0 }
          acc[item.ciudad].ventas += item.ventas
          acc[item.ciudad].impulsos += item.impulsos
          return acc
        }, {} as Record<string, any>)
      const arr = Object.values(grouped).sort((a: any, b: any) => b.ventas - a.ventas).slice(0, 8)
      return { tipo: t, data: arr }
    })
    return res
  }, [filteredData])

  // 6) Mapa con marcadores por ciudad (no cambia tus gráficos; es adicional)
  const cityCoords: Record<string, [number, number]> = {
    BOGOTA: [-74.0721, 4.711],
    MEDELLIN: [-75.5812, 6.2442],
    CALI: [-76.532, 3.4516],
    BARRANQUILLA: [-74.796, 10.9878],
    BUCARAMANGA: [-73.1198, 7.1193],
    PEREIRA: [-75.6906, 4.8133],
    ARMENIA: [-75.6811, 4.5339],
    TUNJA: [-73.357, 5.5353],
    CHIA: [-74.0507, 4.8617],
  }

  const mapMarkers = useMemo(() => {
    const byCity = filteredData.reduce((acc, item) => {
      if (!acc[item.ciudad]) acc[item.ciudad] = { ciudad: item.ciudad, ventas: 0, impulsos: 0 }
      acc[item.ciudad].ventas += item.ventas
      acc[item.ciudad].impulsos += item.impulsos
      return acc
    }, {} as Record<string, any>)

    const markers = Object.values(byCity)
      .map((c: any) => {
        const coord = cityCoords[c.ciudad]
        if (!coord) return null
        return {
          ...c,
          coord,
          ratio: c.impulsos > 0 ? Number((c.ventas / c.impulsos).toFixed(2)) : 0,
        }
      })
      .filter(Boolean) as Array<{ ciudad: string; ventas: number; impulsos: number; coord: [number, number]; ratio: number }>

    const maxVentas = markers.reduce((m, x) => Math.max(m, x.ventas), 1)
    return { markers, maxVentas }
  }, [filteredData])

  const handlePrint = () => window.print()

  const COLORS = ["#f59e0b", "#dc2626", "#0891b2", "#10b981", "#8b5cf6", "#ec4899"]

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Overview View */}
      {activeView === "overview" && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard de Activaciones</h1>
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
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
              <div className="p-4 rounded-lg bg-card border border-border">
                <label className="flex items-center gap-2 mb-2 font-semibold text-card-foreground">
                  <Activity size={20} />
                  Actividad
                </label>
                <select
                  value={filters.actividad}
                  onChange={(e) => setFilters({ ...filters, actividad: e.target.value })}
                  className="w-full p-2 rounded border border-border bg-input text-foreground"
                >
                  <option value="all">Todas</option>
                  {actividades.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-lg bg-card border border-border">
                <label className="flex items-center gap-2 mb-2 font-semibold text-card-foreground">
                  <Calendar size={20} />
                  Fecha
                </label>
                <select
                  value={filters.fecha}
                  onChange={(e) => setFilters({ ...filters, fecha: e.target.value })}
                  className="w-full p-2 rounded border border-border bg-input text-foreground"
                >
                  <option value="all">Todas</option>
                  {fechas.map((fecha) => (
                    <option key={fecha} value={fecha}>
                      {fecha}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-lg bg-card border border-border">
                <label className="flex items-center gap-2 mb-2 font-semibold text-card-foreground">
                  <MapPin size={20} />
                  Ciudad
                </label>
                <select
                  value={filters.ciudad}
                  onChange={(e) => setFilters({ ...filters, ciudad: e.target.value })}
                  className="w-full p-2 rounded border border-border bg-input text-foreground"
                >
                  <option value="all">Todas</option>
                  {ciudades.map((ciudad) => (
                    <option key={ciudad} value={ciudad}>
                      {ciudad}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* KPI Cards */}
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-lg bg-primary">
                    <TrendingUp size={24} className="text-primary-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">VENTAS UNIDADES</p>
                <p className="text-3xl font-bold mt-1 text-card-foreground">{kpis.ventas.toLocaleString()}</p>
              </div>

              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-lg bg-destructive">
                    <Users size={24} className="text-destructive-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">IMPULSOS REALIZADOS</p>
                <p className="text-3xl font-bold mt-1 text-card-foreground">{kpis.impulsos}</p>
              </div>

              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-lg bg-primary">
                    <Activity size={24} className="text-primary-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">PROMEDIO VENTAS</p>
                <p className="text-3xl font-bold mt-1 text-card-foreground">{kpis.promedio.toLocaleString()}</p>
              </div>

              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 rounded-lg bg-destructive">
                    <Eye size={24} className="text-destructive-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">TASA CONVERSIÓN</p>
                <p className="text-3xl font-bold mt-1 text-card-foreground">{kpis.conversion}%</p>
              </div>
            </div>
          </section>

          {/* Main Charts */}
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ventas por Actividad */}
              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">Ventas por Actividad</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={actividadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="actividad" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="ventas" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Impulsos por Actividad */}
              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">Impulsos por Actividad</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={actividadData} dataKey="impulsos" nameKey="actividad" cx="50%" cy="50%" outerRadius={100} label>
                      {actividadData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Comparación de Ciudades */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">
                Comparación de Ciudades - Ventas vs Impulsos
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={ciudadData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="ciudad" stroke="#888" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ventas" fill="#f59e0b" name="Ventas" />
                  <Bar dataKey="impulsos" fill="#dc2626" name="Impulsos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Tendencia Temporal */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">Tendencia de Ventas en el Tiempo</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="fecha" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ventas" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="impulsos" stroke="#dc2626" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Análisis Avanzados */}
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Eficiencia por Ciudad */}
              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">
                  Eficiencia por Ciudad (Ventas/Promotora)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={ciudadEfficiency} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis type="number" stroke="#888" />
                    <YAxis dataKey="ciudad" type="category" width={100} stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                      }}
                    />
                    <Bar dataKey="eficiencia" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar Chart - Top 5 Ciudades */}
              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">
                  Comparación Multidimensional - Top 5 Ciudades
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis dataKey="metric" stroke="#888" />
                    <PolarRadiusAxis stroke="#888" />
                    {ciudadData.slice(0, 5).map((ciudad: any, index) => (
                      <Radar
                        key={ciudad.ciudad}
                        name={ciudad.ciudad}
                        dataKey={ciudad.ciudad}
                        stroke={COLORS[index]}
                        fill={COLORS[index]}
                        fillOpacity={0.3}
                      />
                    ))}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Scatter Plot - Relación Impulsos vs Ventas */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">
                Relación entre Impulsos y Ventas por Ciudad
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="x" name="Impulsos" stroke="#888" label={{ value: "Total Impulsos", position: "insideBottom", offset: -5 }} />
                  <YAxis dataKey="y" name="Ventas" stroke="#888" label={{ value: "Total Ventas", angle: -90, position: "insideLeft" }} />
                  <ZAxis dataKey="z" range={[100, 1000]} name="Eventos" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    formatter={(value: any, name: string) => {
                      if (name === "Eventos") return Math.round(value / 100)
                      return value
                    }}
                  />
                  <Legend />
                  <Scatter name="Ciudades" data={scatterData} fill="#8b5cf6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Distribución por Promotoras */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">Promotoras por Ciudad</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ciudadData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="ciudad" stroke="#888" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                  <Legend />
                  <Bar dataKey="promotoras" fill="#ec4899" name="Promotoras" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ========================================================= */}
          {/* ✅ NUEVAS GRÁFICAS (ADICIONALES A LAS EXISTENTES) */}
          {/* ========================================================= */}

          {/* 1) Stacked: Ventas por tipo en cada ciudad */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">
                Ventas por Ciudad (Desglosado por Tipo)
              </h3>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={stackedCityByType.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="ciudad" stroke="#888" angle={-45} textAnchor="end" height={110} />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                  <Legend />
                  <Bar dataKey="IMPULSO" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="SAMPLING" stackId="a" fill="#0891b2" />
                  <Bar dataKey="MICHELADA" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 2) Rendimiento por tipo (ventas/impulso) */}
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">Rendimiento por Tipo (Ventas/Impulso)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={rendimientoPorTipo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="actividad" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                    <Legend />
                    <Bar dataKey="ventas" name="Ventas" fill="#f59e0b" />
                    <Line type="monotone" dataKey="ventasPorImpulso" name="Ventas/Impulso" stroke="#10b981" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">Rendimiento por Ciudad (Ventas/Impulso)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rendimientoPorCiudad.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis type="number" stroke="#888" />
                    <YAxis dataKey="ciudad" type="category" width={110} stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                    <Legend />
                    <Bar dataKey="ventasPorImpulso" name="Ventas/Impulso" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* 3) Matriz ciudad vs tipo (estilo heatmap) */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">Matriz Ciudad vs Tipo (Ventas)</h3>
              <ResponsiveContainer width="100%" height={420}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 60, left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis type="category" dataKey="x" name="Tipo" stroke="#888" interval={0} angle={-10} textAnchor="end" height={80} />
                  <YAxis type="category" dataKey="y" name="Ciudad" stroke="#888" width={120} />
                  <ZAxis dataKey="z" range={[80, 1200]} name="Ventas (tamaño)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                    formatter={(v: any, name: string, props: any) => {
                      if (name === "Ventas (tamaño)") return props?.payload?.ventas
                      return v
                    }}
                    labelFormatter={() => ""}
                  />
                  <Legend />
                  <Scatter
                    name="Ventas por combinación"
                    data={heatmapCityType.points}
                    fill="#8b5cf6"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 4) Top ciudades por cada tipo (3 gráficos) */}
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {topCiudadesPorTipo.map((block) => (
                <div key={block.tipo} className="p-6 rounded-lg shadow-lg bg-card border border-border">
                  <h3 className="text-xl font-bold mb-4 text-card-foreground">Top Ciudades — {block.tipo}</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={block.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="ciudad" stroke="#888" angle={-35} textAnchor="end" height={90} />
                      <YAxis stroke="#888" />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                      <Legend />
                      <Bar dataKey="ventas" name="Ventas" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </section>

          {/* 5) Mapa (marcadores por ciudad, tamaño/color según ventas) */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-2 text-card-foreground">Mapa — Ventas por Ciudad</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Marcadores por ciudad: tamaño proporcional a ventas (según filtros).
              </p>

              <div className="w-full overflow-hidden rounded-lg border border-border bg-background">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ center: [-74, 4.5], scale: 2400 }}
                  style={{ width: "100%", height: "440px" }}
                >
                  {/* Mapa base (países) */}
                  <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: { fill: "#0f172a", outline: "none" },
                            hover: { fill: "#111827", outline: "none" },
                            pressed: { fill: "#0b1220", outline: "none" },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {/* Marcadores */}
                  {mapMarkers.markers.map((m) => {
                    const r = 4 + (m.ventas / mapMarkers.maxVentas) * 10
                    return (
                      <Marker key={m.ciudad} coordinates={m.coord}>
                        <circle
                          r={r}
                          fill="#f59e0b"
                          stroke="#111827"
                          strokeWidth={2}
                          opacity={0.85}
                        />
                        <text
                          y={-12}
                          textAnchor="middle"
                          style={{ fontSize: 10, fill: "#e5e7eb" }}
                        >
                          {m.ciudad}
                        </text>
                      </Marker>
                    )
                  })}
                </ComposableMap>
              </div>
            </div>
          </section>

          {/* 6) Bonus: Area “mix” (ventas e impulsos) por fecha */}
          <section className="mb-8">
            <div className="p-6 rounded-lg shadow-lg bg-card border border-border">
              <h3 className="text-xl font-bold mb-4 text-card-foreground">Mix Temporal (Área) — Ventas e Impulsos</h3>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="fecha" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                  <Legend />
                  <Area type="monotone" dataKey="ventas" name="Ventas (Área)" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.25} />
                  <Line type="monotone" dataKey="impulsos" name="Impulsos (Línea)" stroke="#dc2626" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      {/* People View - Company Only */}
      {activeView === "people" && userType === "company" && (
        <section>
          <PeopleMonitoring />
        </section>
      )}

      {/* Company View - Company Only */}
      {activeView === "company" && userType === "company" && (
        <section>
          <CompanyComments />
        </section>
      )}

      {/* Employee Campaign View - Employee Only */}
      {activeView === "employee" && userType === "employee" && (
        <section>
          <EmployeeCampaignView />
        </section>
      )}
    </>
  )
}
