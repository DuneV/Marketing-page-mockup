// lib/report-config-labels.ts

import type { DataSource, ChartType, KPIOperation } from "@/types/report-config"

// Etiquetas amigables para fuentes de datos
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  ventas_clubcolombia: "Ventas Club Colombia",
  ventas_aguila: "Ventas Águila",
  ventas_poker: "Ventas Poker",
  ventas_ponymalta: "Ventas Pony Malta",
  engagement_social: "Engagement Social",
  impresiones_totales: "Impresiones Totales",
  roi_campana: "ROI Campaña",
  costo_adquisicion: "Costo de Adquisición",
  tasa_conversion: "Tasa de Conversión",
  alcance_total: "Alcance Total",
}

// Etiquetas amigables para tipos de gráficos
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  torta: "Gráfico de Torta",
  barras: "Gráfico de Barras",
  spline: "Gráfico de Línea",
  plot: "Gráfico de Puntos",
  scatter: "Dispersión",
  area: "Gráfico de Área",
  radar: "Gráfico Radar",
  funnel: "Embudo",
  gauge: "Medidor",
  heatmap: "Mapa de Calor",
  treemap: "Mapa de Árbol",
  tabla: "Tabla de Datos",
}

// Etiquetas amigables para operaciones de KPI
export const KPI_OPERATION_LABELS: Record<KPIOperation, string> = {
  mean: "Promedio",
  sum: "Suma",
  count: "Conteo",
  max: "Máximo",
  min: "Mínimo",
  median: "Mediana",
  std: "Desviación Estándar",
  variance: "Varianza",
}

// Helper para obtener etiqueta de fuente de datos
export function getDataSourceLabel(source: DataSource): string {
  return DATA_SOURCE_LABELS[source] || source
}

// Helper para obtener etiqueta de tipo de gráfico
export function getChartTypeLabel(type: ChartType): string {
  return CHART_TYPE_LABELS[type] || type
}

// Helper para obtener etiqueta de operación
export function getOperationLabel(operation: KPIOperation): string {
  return KPI_OPERATION_LABELS[operation] || operation
}

// Agrupar fuentes de datos por categoría
export const DATA_SOURCE_GROUPS = {
  ventas: [
    "ventas_clubcolombia",
    "ventas_aguila",
    "ventas_poker",
    "ventas_ponymalta",
  ] as DataSource[],
  metricas_digitales: [
    "engagement_social",
    "impresiones_totales",
    "alcance_total",
  ] as DataSource[],
  rendimiento: [
    "roi_campana",
    "costo_adquisicion",
    "tasa_conversion",
  ] as DataSource[],
}

// Agrupar tipos de gráficos por categoría
export const CHART_TYPE_GROUPS = {
  basicos: ["torta", "barras", "spline", "area"] as ChartType[],
  avanzados: ["radar", "funnel", "gauge", "heatmap", "treemap"] as ChartType[],
  analisis: ["plot", "scatter", "tabla"] as ChartType[],
}