import { Card } from "@/components/ui/card"

export interface KPICardProps {
  label: string
  value: string
  icon: string
  color: "bg-amber-600" | "bg-red-600"
}

export default function KPICard({ label, value, icon, color }: KPICardProps) {
  return (
    <Card className={`${color} p-6 border-0 text-white shadow-md hover:shadow-lg transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-sm text-white/80 mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </Card>
  )
}
