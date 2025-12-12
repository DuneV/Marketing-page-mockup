"use client";

import { useEffect, useState } from "react";
import { reportConfigStorage } from "@/lib/report-config-storage";
import type { ReportConfiguration } from "@/types/report-config";
import { DynamicKPI } from "./dynamic-kpi";
import { DynamicChart } from "./dynamic-chart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DynamicDashboardProps {
  empresaId: string;
  empresaNombre?: string;
}

export function DynamicDashboard({ empresaId, empresaNombre }: DynamicDashboardProps) {
  const [config, setConfig] = useState<ReportConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar storage
    reportConfigStorage.initialize();

    // Cargar configuración
    const reportConfig = reportConfigStorage.getConfigurationByCompany(empresaId);

    if (!reportConfig) {
      setError(
        "No hay una configuración de reporte activa para esta empresa. Por favor, contacta al administrador."
      );
      setLoading(false);
      return;
    }

    setConfig(reportConfig);
    setLoading(false);
  }, [empresaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No se encontró configuración de reporte para esta empresa.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información de la configuración */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Dashboard - {empresaNombre || config.empresaNombre}
          </h2>
          {config.filtros.fechas && (
            <p className="text-sm text-muted-foreground mt-1">
              Periodo: {new Date(config.filtros.fechas.inicio).toLocaleDateString("es-ES")} -{" "}
              {new Date(config.filtros.fechas.fin).toLocaleDateString("es-ES")}
            </p>
          )}
        </div>
      </div>

      {/* KPIs Section */}
      {config.kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.kpis.map((kpi) => (
            <DynamicKPI key={kpi.id} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Dashboard Rows with Charts */}
      {config.filas.length > 0 ? (
        <div className="space-y-6">
          {config.filas
            .sort((a, b) => a.orden - b.orden)
            .map((fila) => {
              // Mapa de clases seguras para Tailwind
              const getColumnClass = (cols: number) => {
                const columnClasses: Record<number, string> = {
                  1: "col-span-12 md:col-span-1",
                  2: "col-span-12 md:col-span-2",
                  3: "col-span-12 md:col-span-3",
                  4: "col-span-12 md:col-span-4",
                  5: "col-span-12 md:col-span-5",
                  6: "col-span-12 md:col-span-6",
                  7: "col-span-12 md:col-span-7",
                  8: "col-span-12 md:col-span-8",
                  9: "col-span-12 md:col-span-9",
                  10: "col-span-12 md:col-span-10",
                  11: "col-span-12 md:col-span-11",
                  12: "col-span-12"
                };
                return columnClasses[cols] || "col-span-12";
              };

              return (
                <div key={fila.id}>
                  {fila.graficos.length > 0 && (
                    <div className="grid grid-cols-12 gap-4">
                      {fila.graficos.map((grafico) => (
                        <div
                          key={grafico.id}
                          className={getColumnClass(grafico.columnas)}
                        >
                          <DynamicChart chart={grafico} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[200px]">
            <p className="text-muted-foreground">
              No hay gráficos configurados en este dashboard
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metadata Footer */}
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        Última actualización: {new Date(config.fechaActualizacion).toLocaleString("es-ES")}
      </div>
    </div>
  );
}
