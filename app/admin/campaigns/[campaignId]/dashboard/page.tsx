"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download } from "lucide-react"

import type { ReportConfiguration } from "@/types/report-config"
import { getCampaignDataset, getCampaignReportConfig } from "@/lib/api/campaignApi"
import { DashboardFromConfig } from "@/components/dashboard-from-config"

export default function CampaignDashboardPreviewPage() {
  const params = useParams<{ campaignId: string }>()
  const router = useRouter()
  const campaignId = params.campaignId

  const [config, setConfig] = useState<ReportConfiguration | null>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    if (!campaignId) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const remote = await getCampaignReportConfig(campaignId)
        const exists = (remote as any)?.exists
        const cfg = (remote as any)?.config as ReportConfiguration | null
        setConfig(exists ? cfg : null)
      } catch (e: any) {
        setConfig(null)
        setError(e?.message ?? "No se pudo cargar el dashboard")
      } finally {
        setLoading(false)
      }
    })()
  }, [campaignId])

  useEffect(() => {
    if (!campaignId) return
    ;(async () => {
      setLoadingData(true)
      setDataError(null)
      try {
        const dataset = await getCampaignDataset(campaignId)
        setRows(Array.isArray(dataset) ? dataset : [])
      } catch (e: any) {
        setRows([])
        setDataError(e?.message ?? "No se pudo cargar dataset")
      } finally {
        setLoadingData(false)
      }
    })()
  }, [campaignId])

  const handleDownload = () => {
    if (!config) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2))
    const a = document.createElement("a")
    a.href = dataStr
    a.download = `dashboard_${(config as any)?.campaignNombre ?? campaignId}.json`
    a.click()
  }

  if (loading) return <div className="p-6">Cargando dashboard...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">Previsualización de Dashboard</h1>

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

      {dataError && (
        <Card>
          <CardHeader>
            <CardTitle>Error Dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{dataError}</p>
          </CardContent>
        </Card>
      )}

      {!config ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay dashboard guardado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta campaña todavía no tiene configuración de reporte guardada. Ve a campañas y crea el dashboard con el builder.
            </p>
          </CardContent>
        </Card>
      ) : loadingData ? (
        <div className="p-6">Cargando datos...</div>
      ) : (
        <DashboardFromConfig config={config} data={rows} campaignId={campaignId} />
      )}
    </div>
  )
}