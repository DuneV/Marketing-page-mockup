// components\views\company-dashboard-view.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

import type { Campaign } from "@/types/campaign"
import { getMyCampaignsWithDashboard } from "@/lib/api/campaignApi"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export function CompanyDashboardView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignId, setCampaignId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  )

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // ✅ El backend ahora devuelve { campaignIds, campaigns }
        // Ya no necesitamos llamar a getAllCampaigns() ni filtrar localmente
        const { campaigns: fetchedCampaigns } = await getMyCampaignsWithDashboard()
        
        // Cast a Campaign[] porque el backend devuelve todos los campos de Firestore
        setCampaigns(fetchedCampaigns as Campaign[])
        setCampaignId(fetchedCampaigns.length > 0 ? fetchedCampaigns[0].id : "")
      } catch (e: any) {
        console.error("Error loading campaigns:", e)
        setError(e?.message ?? "No se pudieron cargar campañas con dashboard")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboards disponibles</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando campañas con dashboard...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay campañas con dashboard guardado. Contacta al administrador.
            </p>
          ) : (
            <>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una campaña..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selected && (
                <p className="text-xs text-muted-foreground">
                  Seleccionado: <span className="font-medium">{selected.nombre}</span>
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild disabled={!campaignId}>
                  <Link href={`/company/campaigns/${campaignId}/dashboard`}>Ver dashboard</Link>
                </Button>

                <Button variant="outline" asChild disabled={!campaignId}>
                  <a
                    href={`/company/campaigns/${campaignId}/dashboard`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir en otra pestaña
                  </a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}