// app/company/campaigns/[campaignId]/dashboard/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download } from "lucide-react"

import type { ReportConfiguration } from "@/types/report-config"
import { getCampaignReportConfig, getCampaignDataset } from "@/lib/api/campaignApi"

import { DashboardFromConfig } from "@/components/dashboard-from-config"

export default function CompanyCampaignDashboardPage() {
  const params = useParams<{ campaignId: string }>()
  const router = useRouter()
  const campaignId = params.campaignId

  const [config, setConfig] = useState<ReportConfiguration | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!campaignId) return
    
    ;(async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 1. Cargar configuración del dashboard
        const remote = await getCampaignReportConfig(campaignId)
        const exists = (remote as any)?.exists
        const cfg = (remote as any)?.config as ReportConfiguration | null

        if (!exists || !cfg) {
          setConfig(null)
          setData([])
          setLoading(false)
          return
        }

        setConfig(cfg)

        // 2. Cargar datos del dataset de la campaña
        try {
          const rows = await getCampaignDataset(campaignId)
          console.log(`[Dashboard] Loaded ${rows?.length ?? 0} rows for campaign ${campaignId}`)
          setData(rows || [])
        } catch (dataError: any) {
          console.error("Error loading campaign dataset:", dataError)
          setError("No se pudieron cargar los datos de la campaña. Asegúrate de que se haya importado información.")
          setData([])
        }

      } catch (e: any) {
        console.error("Error loading dashboard config:", e)
        setConfig(null)
        setData([])
        setError(e?.message ?? "No se pudo cargar el dashboard")
      } finally {
        setLoading(false)
      }
    })()
  }, [campaignId])

  const handleDownload = () => {
    if (!config) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2))
    const a = document.createElement("a")
    a.href = dataStr
    a.download = `dashboard_${config.campaignNombre ?? campaignId}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
          Dashboard de Campaña
        </h1>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={!config} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar JSON
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {!config ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay dashboard disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta campaña todavía no tiene un dashboard configurado. Contacta al administrador para que lo configure.
            </p>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay datos disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No se encontraron datos para esta campaña. Asegúrate de que se haya importado información desde un archivo Excel.
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <DashboardFromConfig 
          config={config} 
          data={data}
          campaignId={campaignId}
        />
      )}
    </div>
  )
}