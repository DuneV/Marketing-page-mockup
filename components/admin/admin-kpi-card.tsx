import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface AdminKPICardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: "amber" | "red"
}

export function AdminKPICard({ label, value, icon: Icon, color }: AdminKPICardProps) {
  const colorClasses = {
    amber: "bg-amber-600 dark:bg-amber-700",
    red: "bg-red-600 dark:bg-red-700",
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
