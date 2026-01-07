// Tipos de gráficos reservados disponibles en el sistema
export type ChartType =
  | "torta"           // Pie chart
  | "barras"          // Bar chart
  | "spline"          // Spline/Line chart
  | "plot"            // Plot/Scatter plot
  | "scatter"         // Scatter chart
  | "area"            // Area chart
  | "radar"           // Radar chart
  | "funnel"          // Funnel chart
  | "gauge"           // Gauge/Meter
  | "heatmap"         // Heat map
  | "treemap"         // Tree map
  | "tabla";          // Data table

// Columnas de Bootstrap (1-12)
export type BootstrapCol = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Operaciones para KPIs
export type KPIOperation =
  | "mean"            // Promedio
  | "sum"             // Suma
  | "count"           // Conteo
  | "max"             // Máximo
  | "min"             // Mínimo
  | "median"          // Mediana
  | "std"             // Desviación estándar
  | "variance";       // Varianza

// Fuentes de datos disponibles
export type DataSource =
  | "ventas_clubcolombia"
  | "ventas_aguila"
  | "ventas_poker"
  | "ventas_ponymalta"
  | "engagement_social"
  | "impresiones_totales"
  | "roi_campana"
  | "costo_adquisicion"
  | "tasa_conversion"
  | "alcance_total";

// Filtro de rango de fechas
export interface DateFilter {
  inicio: string;      // Formato ISO: "2000-01-01"
  fin: string;         // Formato ISO: "2010-12-31"
}

// Definición de un KPI
export interface KPIDefinition {
  id: string;
  nombre: string;                    // Ej: "Promedio Ventas Club Colombia"
  operacion: KPIOperation;           // Ej: "mean"
  fuente: DataSource;                // Ej: "ventas_clubcolombia"
  descripcion?: string;              // Descripción opcional del KPI
}

// Definición de un gráfico individual
export interface ChartDefinition {
  id: string;
  tipo: ChartType;                   // Tipo de gráfico
  titulo: string;                    // Título del gráfico
  fuente: DataSource;                // Fuente de datos
  columnas: BootstrapCol;            // Ancho en columnas (1-12)
  configuracion?: {                  // Configuración adicional del gráfico
    color?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    height?: number;
    [key: string]: any;              // Permite configuraciones personalizadas
  };
}

// Definición de una fila en el dashboard
export interface DashboardRow {
  id: string;
  orden: number;                     // Orden de la fila en el dashboard
  graficos: ChartDefinition[];       // Gráficos en esta fila
}

// Configuración completa del reporte para una campaña
export interface ReportConfiguration {
  id: string;                        // UUID de la configuración
  campaignId: string;                // ID de la campaña (Nueva ubicación)
  campaignNombre: string;            // Nombre de la campaña
  empresaId: string;                 // ID de la empresa (Padre)
  empresaNombre: string;             // Nombre de la empresa para referencia
  filtros: {
    fechas?: DateFilter;             // Filtro de fechas opcional
    marcas?: string[];               // Filtro de marcas opcional
    campanas?: string[];             // Filtro de campañas opcional
  };
  kpis: KPIDefinition[];             // KPIs configurados
  filas: DashboardRow[];             // Filas del dashboard con sus gráficos
  activa: boolean;                   // Si la configuración está activa
  fechaCreacion: string;             // Fecha de creación de la config
  fechaActualizacion: string;        // Última actualización
}

// Ejemplo de uso según tu estructura:
/*
{
  empresaId: "uuid-de-empresa",
  empresaNombre: "empresa",
  filtros: {
    fechas: {
      inicio: "2000-01-01",
      fin: "2010-12-31"
    }
  },
  kpis: [
    {
      id: "kpi-1",
      nombre: "Promedio Ventas Club Colombia",
      operacion: "mean",
      fuente: "ventas_clubcolombia",
      descripcion: "Promedio histórico de ventas"
    }
  ],
  filas: [
    {
      id: "fila-1",
      orden: 1,
      graficos: [
        {
          id: "chart-1",
          tipo: "torta",
          titulo: "Distribución Ventas",
          fuente: "ventas_clubcolombia",
          columnas: 6
        },
        {
          id: "chart-2",
          tipo: "barras",
          titulo: "Ventas por Mes",
          fuente: "ventas_aguila",
          columnas: 6
        }
      ]
    },
    {
      id: "fila-2",
      orden: 2,
      graficos: [
        {
          id: "chart-3",
          tipo: "spline",
          titulo: "Tendencia",
          fuente: "ventas_poker",
          columnas: 12
        }
      ]
    }
  ]
}
*/

// Plantillas predefinidas de reportes
export interface ReportTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: "basico" | "avanzado" | "ejecutivo" | "operacional";
  configuracion: Omit<ReportConfiguration, "id" | "campaignId" | "campaignNombre" | "empresaId" | "empresaNombre" | "fechaCreacion" | "fechaActualizacion">;
}

// Para la gestión de servicios disponibles por empresa
export interface ServicePackage {
  id: string;
  nombre: string;                    // Ej: "Paquete Básico", "Paquete Premium"
  descripcion: string;
  graficosPermitidos: ChartType[];   // Tipos de gráficos disponibles
  maxKPIs: number;                   // Máximo número de KPIs
  maxFilas: number;                  // Máximo número de filas
  maxGraficosPorFila: number;        // Máximo gráficos por fila
  fuentesDatos: DataSource[];        // Fuentes de datos disponibles
  precio?: number;                   // Precio mensual (opcional)
}

// Asignación de paquete de servicio a empresa
export interface CompanyServiceAssignment {
  empresaId: string;
  paqueteId: string;
  fechaInicio: string;
  fechaFin?: string;                 // null = sin fecha de fin
  activo: boolean;
}
