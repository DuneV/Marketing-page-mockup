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
          Aquí puedes mostrar: últimos imports, estado del worker, validaciones, y links rápidos a campañas/configuración.
        </CardContent>
      </Card>
    </div>
  )
}
