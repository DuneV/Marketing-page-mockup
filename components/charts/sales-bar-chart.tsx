"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"

const data = [
  { name: "Águila", sales: 385000, revenue: 2400 },
  { name: "Poker", sales: 521000, revenue: 2210 },
  { name: "Club Colombia", sales: 429000, revenue: 2290 },
  { name: "Pony Malta", sales: 215000, revenue: 2000 },
]

export default function SalesBarChart() {
  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Sales by Brand</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              color: "#1f2937",
            }}
            labelStyle={{ color: "#1f2937" }}
          />
          <Legend wrapperStyle={{ color: "#6b7280" }} />
          <Bar dataKey="sales" fill="#d97706" radius={[8, 8, 0, 0]} name="Sales ($)" />
          <Bar dataKey="revenue" fill="#dc2626" radius={[8, 8, 0, 0]} name="Revenue ($1000s)" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
