"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"

const data = [
  { date: "Dec 1", engagement: 4200, reach: 2400 },
  { date: "Dec 5", engagement: 3900, reach: 2210 },
  { date: "Dec 10", engagement: 5200, reach: 2290 },
  { date: "Dec 15", engagement: 6100, reach: 2000 },
  { date: "Dec 20", engagement: 7200, reach: 2800 },
  { date: "Dec 25", engagement: 8100, reach: 3908 },
  { date: "Dec 30", engagement: 8500, reach: 4800 },
]

export default function EngagementLineChart() {
  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Engagement Trend</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              color: "#1f2937",
            }}
            labelStyle={{ color: "#1f2937" }}
            formatter={(value) => value.toLocaleString()}
          />
          <Legend wrapperStyle={{ color: "#6b7280" }} />
          <Line
            type="monotone"
            dataKey="engagement"
            stroke="#d97706"
            strokeWidth={3}
            dot={{ fill: "#d97706", r: 5 }}
            activeDot={{ r: 7 }}
            name="Engagement"
          />
          <Line
            type="monotone"
            dataKey="reach"
            stroke="#dc2626"
            strokeWidth={3}
            dot={{ fill: "#dc2626", r: 5 }}
            activeDot={{ r: 7 }}
            name="Reach"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
