"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Activity,
} from "lucide-react";
import type { KPIDefinition, DataSource, KPIOperation } from "@/types/report-config";

// Mock data generator - En producción, esto vendría de tu API
const calculateKPIValue = (operation: KPIOperation, source: DataSource): number => {
  // Simular datos aleatorios basados en la fuente
  const mockData = Array.from({ length: 10 }, () => Math.random() * 10000);

  switch (operation) {
    case "mean":
      return mockData.reduce((a, b) => a + b, 0) / mockData.length;
    case "sum":
      return mockData.reduce((a, b) => a + b, 0);
    case "count":
      return mockData.length;
    case "max":
      return Math.max(...mockData);
    case "min":
      return Math.min(...mockData);
    case "median":
      const sorted = [...mockData].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    case "std":
      const mean = mockData.reduce((a, b) => a + b, 0) / mockData.length;
      const variance =
        mockData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / mockData.length;
      return Math.sqrt(variance);
    case "variance":
      const avg = mockData.reduce((a, b) => a + b, 0) / mockData.length;
      return mockData.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / mockData.length;
    default:
      return 0;
  }
};

const formatKPIValue = (value: number, operation: KPIOperation): string => {
  if (operation === "count") {
    return value.toFixed(0);
  }

  // Formatear números grandes
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toFixed(0);
};

const getIconForSource = (source: DataSource) => {
  if (source.includes("ventas") || source.includes("roi")) {
    return DollarSign;
  }
  if (source.includes("engagement") || source.includes("alcance")) {
    return Users;
  }
  if (source.includes("conversion") || source.includes("costo")) {
    return Target;
  }
  return Activity;
};

interface DynamicKPIProps {
  kpi: KPIDefinition;
  value?: number;
  trend?: number; // Porcentaje de cambio (opcional)
  showTrend?: boolean;
}

export function DynamicKPI({ kpi, value, trend, showTrend = true }: DynamicKPIProps) {
  // Usar valor provisto o calcular mock value
  const kpiValue = value !== undefined ? value : calculateKPIValue(kpi.operacion, kpi.fuente);
  const formattedValue = formatKPIValue(kpiValue, kpi.operacion);

  // Generar tendencia aleatoria si no se provee
  const kpiTrend = trend !== undefined ? trend : (Math.random() - 0.5) * 20;
  const isPositive = kpiTrend >= 0;

  const Icon = getIconForSource(kpi.fuente);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{kpi.nombre}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {showTrend && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {Math.abs(kpiTrend).toFixed(1)}%
            </span>
            <span>vs. periodo anterior</span>
          </div>
        )}
        {kpi.descripcion && (
          <p className="text-xs text-muted-foreground mt-2">{kpi.descripcion}</p>
        )}
      </CardContent>
    </Card>
  );
}
