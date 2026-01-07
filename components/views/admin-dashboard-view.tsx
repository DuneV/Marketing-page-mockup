"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { Database, CheckCircle, UploadCloud, AlertCircle } from "lucide-react"

// Si luego quieres, esto puede venir de tu import-api (GET /admin/stats)
// Por ahora lo dejo mock con loading para estilo AdminView.
export function AdminDashboardView() {
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    totalImports: 0,
    analyzed: 0,
    processing: 0,
    errors: 0,
  })

  useEffect(() => {
    // TODO: fetch real stats (import-api)
    setTimeout(() => {
      setStats({ totalImports: 12, analyzed: 7, processing: 3, errors: 2 })
      setLoading(false)
    }, 600)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-amber-600" />
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard label="Imports Totales" value={stats.totalImports} icon={UploadCloud} color="amber" />
        <AdminKPICard label="Analizados" value={stats.analyzed} icon={CheckCircle} color="red" />
        <AdminKPICard label="Procesando" value={stats.processing} icon={Database} color="amber" />
        <AdminKPICard label="Errores" value={stats.errors} icon={AlertCircle} color="red" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300">
          <div className="space-y-4">
            {[
              { text: "Empresa 'TechSolutions' importó 150 productos", time: "Hace 10 min", icon: UploadCloud, color: "text-blue-500" },
              { text: "Campaña 'Verano 2025' completó el análisis", time: "Hace 45 min", icon: CheckCircle, color: "text-green-500" },
              { text: "Nuevo usuario registrado: Juan Pérez", time: "Hace 2 horas", icon: Database, color: "text-amber-500" },
              { text: "Error de validación en 'Importación Masiva #4'", time: "Hace 5 horas", icon: AlertCircle, color: "text-red-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <item.icon className={`h-5 w-5 mt-0.5 ${item.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.text}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
