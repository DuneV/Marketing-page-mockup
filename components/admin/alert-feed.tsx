"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Calendar, Building2, UserX } from "lucide-react"
import type { Campaign } from "@/types/campaign"
import type { Company } from "@/types/company"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface AlertFeedProps {
  expiringCampaigns: Campaign[]
  inactiveCompanies: Company[]
}

export function AlertFeed({ expiringCampaigns, inactiveCompanies }: AlertFeedProps) {
  const alerts = [
    ...expiringCampaigns.map((campaign) => ({
      type: "expiring" as const,
      icon: Calendar,
      color: "text-amber-500",
      title: `Campaña "${campaign.nombre}" próxima a vencer`,
      description: campaign.fechaFin
        ? `Finaliza ${formatDistanceToNow(new Date(campaign.fechaFin), { addSuffix: true, locale: es })}`
        : "Sin fecha de fin",
      time: campaign.fechaFin || "",
    })),
    ...inactiveCompanies.map((company) => ({
      type: "inactive" as const,
      icon: Building2,
      color: "text-blue-500",
      title: `Empresa "${company.nombre}" sin campañas activas`,
      description: "No ha tenido campañas activas en los últimos 30 días",
      time: new Date().toISOString(),
    })),
  ]

  // Ordenar por fecha más reciente
  alerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas y Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No hay alertas activas</p>
            <p className="text-xs text-muted-foreground mt-1">Todo funciona correctamente</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Alertas y Notificaciones</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {alerts.slice(0, 10).map((alert, index) => {
            const Icon = alert.icon
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <Icon className={`h-5 w-5 mt-0.5 ${alert.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
