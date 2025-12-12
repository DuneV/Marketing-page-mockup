"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartType, ChartDefinition, DataSource } from "@/types/report-config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Colores para los gráficos
const COLORS = ["#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5"];

// Mock data generator - En producción, esto vendría de tu API
const generateMockData = (source: DataSource): any[] => {
  const baseData = [
    { name: "Ene", value: Math.random() * 1000 + 500 },
    { name: "Feb", value: Math.random() * 1000 + 500 },
    { name: "Mar", value: Math.random() * 1000 + 500 },
    { name: "Abr", value: Math.random() * 1000 + 500 },
    { name: "May", value: Math.random() * 1000 + 500 },
    { name: "Jun", value: Math.random() * 1000 + 500 },
  ];

  return baseData;
};

interface DynamicChartProps {
  chart: ChartDefinition;
  data?: any[];
}

export function DynamicChart({ chart, data }: DynamicChartProps) {
  // Usar datos provistos o generar mock data
  const chartData = data || generateMockData(chart.fuente);

  const renderChart = () => {
    const height = chart.configuracion?.height || 300;
    const showLegend = chart.configuracion?.showLegend !== false;
    const showGrid = chart.configuracion?.showGrid !== false;

    switch (chart.tipo) {
      case "barras":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {showLegend && <Legend />}
              <Bar dataKey="value" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "spline":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ fill: "#dc2626" }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {showLegend && <Legend />}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "torta":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case "scatter":
      case "plot":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis dataKey="value" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              {showLegend && <Legend />}
              <Scatter name="Datos" data={chartData} fill="#dc2626" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              <Radar
                name="Valores"
                dataKey="value"
                stroke="#dc2626"
                fill="#dc2626"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "tabla":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : item.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case "gauge":
        // Implementación simplificada de gauge
        const gaugeValue = chartData[0]?.value || 0;
        const maxValue = chart.configuracion?.maxValue || 100;
        const percentage = (gaugeValue / maxValue) * 100;

        return (
          <div className="flex flex-col items-center justify-center" style={{ height }}>
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="transform -rotate-90">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="20"
                  strokeDasharray={`${(percentage / 100) * 502.4} 502.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{gaugeValue.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "funnel":
      case "heatmap":
      case "treemap":
        // Implementaciones básicas - pueden expandirse según necesidad
        return (
          <div
            className="flex items-center justify-center bg-muted/30 rounded"
            style={{ height }}
          >
            <p className="text-muted-foreground">
              Gráfico tipo "{chart.tipo}" - En desarrollo
            </p>
          </div>
        );

      default:
        return (
          <div
            className="flex items-center justify-center bg-muted/30 rounded"
            style={{ height }}
          >
            <p className="text-muted-foreground">Tipo de gráfico no soportado</p>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{chart.titulo}</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}
