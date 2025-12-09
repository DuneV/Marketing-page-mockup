"use client"

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"

const data = [
  { name: "Digital", value: 45, color: "#d97706" },
  { name: "TV", value: 28, color: "#dc2626" },
  { name: "Radio", value: 15, color: "#ea580c" },
  { name: "OOH", value: 12, color: "#b91c1c" },
]

export default function ChannelPieChart() {
  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Budget Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              color: "#1f2937",
            }}
            labelStyle={{ color: "#1f2937" }}
            formatter={(value) => `${value}%`}
          />
          <Legend wrapperStyle={{ color: "#6b7280" }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
