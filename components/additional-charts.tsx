"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts"

const conversionData = [
  { name: "Semana 1", rate: 2.4 },
  { name: "Semana 2", rate: 3.1 },
  { name: "Semana 3", rate: 2.8 },
  { name: "Semana 4", rate: 4.2 },
  { name: "Semana 5", rate: 3.9 },
]

const audienceDemoData = [
  { name: "18-24", value: 18 },
  { name: "25-34", value: 32 },
  { name: "35-44", value: 25 },
  { name: "45-54", value: 15 },
  { name: "55+", value: 10 },
]

const costEfficiencyData = [
  { cost: 100, roi: 150 },
  { cost: 150, roi: 280 },
  { cost: 200, roi: 240 },
  { cost: 250, roi: 380 },
  { cost: 300, roi: 450 },
]

export function ConversionRateChart() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Tasa de Conversión Semanal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={conversionData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" />
          <XAxis stroke="var(--color-slate-500)" />
          <YAxis stroke="var(--color-slate-500)" />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#d97706"
            dot={{ fill: "#d97706" }}
            name="Tasa de Conversión (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function AudienceDemographicsChart() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Demográfica de Audiencia</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={audienceDemoData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" />
          <XAxis stroke="var(--color-slate-500)" />
          <YAxis stroke="var(--color-slate-500)" />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#dc2626" name="Porcentaje de Audiencia" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CostEfficiencyChart() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Eficiencia de Costo vs ROI</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-200)" />
          <XAxis dataKey="cost" stroke="var(--color-slate-500)" name="Costo ($)" />
          <YAxis stroke="var(--color-slate-500)" name="ROI (%)" />
          <Tooltip />
          <Legend />
          <Scatter name="Costo vs ROI" data={costEfficiencyData} fill="#d97706" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
