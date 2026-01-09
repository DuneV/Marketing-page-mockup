import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface AdminKPICardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: "amber" | "red"
  trend?: number // Porcentaje de cambio vs período anterior
  trendLabel?: string // Ej: "vs mes anterior"
}

export function AdminKPICard({ label, value, icon: Icon, color, trend, trendLabel = "vs mes anterior" }: AdminKPICardProps) {
  const colorClasses = {
    amber: "bg-amber-600 dark:bg-amber-700",
    red: "bg-red-600 dark:bg-red-700",
  }

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return "text-green-600 dark:text-green-400"
    if (trendValue < 0) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return TrendingUp
    if (trendValue < 0) return TrendingDown
    return Minus
  }

  const formatTrend = (trendValue: number) => {
    const abs = Math.abs(trendValue)
    return `${trendValue > 0 ? "+" : ""}${abs.toFixed(1)}%`
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`${colorClasses[color]} p-3 rounded-lg flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {(() => {
                  const TrendIcon = getTrendIcon(trend)
                  return <TrendIcon className={`h-4 w-4 ${getTrendColor(trend)}`} />
                })()}
                <span className={`text-xs font-medium ${getTrendColor(trend)}`}>
                  {formatTrend(trend)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">{trendLabel}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
