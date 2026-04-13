// components/admin/report-config-builder-wrapper.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCampaign } from "@/lib/data/campaigns"
import { ReportConfigBuilderCampaign } from "./report-config-builder-campaign"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { Campaign } from "@/types/campaign"

export function ReportConfigBuilderCampaignWrapper({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!campaignId) return
    getCampaign(campaignId)
      .then((c) => {
        if (!c) setError("Campaña no encontrada")
        else setCampaign(c as unknown as Campaign)
      })
      .catch((e) => setError(e?.message ?? "Error cargando campaña"))
  }, [campaignId])

  return (
    <div className="container py-6 space-y-4">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !campaign ? (
        <p className="text-sm text-muted-foreground">Cargando campaña...</p>
      ) : (
        <ReportConfigBuilderCampaign campaign={campaign} />
      )}
    </div>
  )
}