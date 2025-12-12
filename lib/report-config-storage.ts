import {
  ReportConfiguration,
  ReportTemplate,
  ServicePackage,
  CompanyServiceAssignment,
  ChartType,
  DataSource,
} from "@/types/report-config";

const STORAGE_KEYS = {
  REPORT_CONFIGS: "report_configurations",
  SERVICE_PACKAGES: "service_packages",
  COMPANY_SERVICES: "company_service_assignments",
  TEMPLATES: "report_templates",
} as const;

// ==================== PLANTILLAS PREDEFINIDAS ====================

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: "template-basico",
    nombre: "Reporte Básico",
    descripcion: "Dashboard simple con KPIs esenciales y gráficos básicos",
    categoria: "basico",
    configuracion: {
      filtros: {},
      kpis: [
        {
          id: "kpi-ventas-total",
          nombre: "Total Ventas",
          operacion: "sum",
          fuente: "ventas_clubcolombia",
        },
        {
          id: "kpi-roi-promedio",
          nombre: "ROI Promedio",
          operacion: "mean",
          fuente: "roi_campana",
        },
      ],
      filas: [
        {
          id: "fila-1",
          orden: 1,
          graficos: [
            {
              id: "chart-1",
              tipo: "barras",
              titulo: "Ventas por Marca",
              fuente: "ventas_clubcolombia",
              columnas: 12,
            },
          ],
        },
      ],
      activa: true,
    },
  },
  {
    id: "template-ejecutivo",
    nombre: "Reporte Ejecutivo",
    descripcion: "Dashboard completo con múltiples KPIs y visualizaciones avanzadas",
    categoria: "ejecutivo",
    configuracion: {
      filtros: {},
      kpis: [
        {
          id: "kpi-roi",
          nombre: "ROI Total",
          operacion: "mean",
          fuente: "roi_campana",
        },
        {
          id: "kpi-alcance",
          nombre: "Alcance Total",
          operacion: "sum",
          fuente: "alcance_total",
        },
        {
          id: "kpi-conversion",
          nombre: "Tasa de Conversión",
          operacion: "mean",
          fuente: "tasa_conversion",
        },
        {
          id: "kpi-engagement",
          nombre: "Engagement Promedio",
          operacion: "mean",
          fuente: "engagement_social",
        },
      ],
      filas: [
        {
          id: "fila-1",
          orden: 1,
          graficos: [
            {
              id: "chart-1",
              tipo: "barras",
              titulo: "Ventas por Marca",
              fuente: "ventas_clubcolombia",
              columnas: 6,
            },
            {
              id: "chart-2",
              tipo: "torta",
              titulo: "Distribución de Ventas",
              fuente: "ventas_aguila",
              columnas: 6,
            },
          ],
        },
        {
          id: "fila-2",
          orden: 2,
          graficos: [
            {
              id: "chart-3",
              tipo: "spline",
              titulo: "Tendencia de ROI",
              fuente: "roi_campana",
              columnas: 12,
            },
          ],
        },
        {
          id: "fila-3",
          orden: 3,
          graficos: [
            {
              id: "chart-4",
              tipo: "area",
              titulo: "Alcance Total",
              fuente: "alcance_total",
              columnas: 6,
            },
            {
              id: "chart-5",
              tipo: "barras",
              titulo: "Engagement Social",
              fuente: "engagement_social",
              columnas: 6,
            },
          ],
        },
      ],
      activa: true,
    },
  },
];

// ==================== PAQUETES DE SERVICIO ====================

const DEFAULT_SERVICE_PACKAGES: ServicePackage[] = [
  {
    id: "paquete-basico",
    nombre: "Paquete Básico",
    descripcion: "Funcionalidades básicas para pequeñas empresas",
    graficosPermitidos: ["torta", "barras", "tabla"],
    maxKPIs: 3,
    maxFilas: 2,
    maxGraficosPorFila: 2,
    fuentesDatos: ["ventas_clubcolombia", "ventas_aguila", "roi_campana"],
    precio: 50000,
  },
  {
    id: "paquete-profesional",
    nombre: "Paquete Profesional",
    descripcion: "Herramientas avanzadas para empresas medianas",
    graficosPermitidos: ["torta", "barras", "spline", "area", "tabla", "scatter"],
    maxKPIs: 6,
    maxFilas: 4,
    maxGraficosPorFila: 3,
    fuentesDatos: [
      "ventas_clubcolombia",
      "ventas_aguila",
      "ventas_poker",
      "ventas_ponymalta",
      "roi_campana",
      "engagement_social",
      "tasa_conversion",
    ],
    precio: 150000,
  },
  {
    id: "paquete-enterprise",
    nombre: "Paquete Enterprise",
    descripcion: "Acceso completo a todas las funcionalidades",
    graficosPermitidos: [
      "torta",
      "barras",
      "spline",
      "plot",
      "scatter",
      "area",
      "radar",
      "funnel",
      "gauge",
      "heatmap",
      "treemap",
      "tabla",
    ],
    maxKPIs: 20,
    maxFilas: 10,
    maxGraficosPorFila: 4,
    fuentesDatos: [
      "ventas_clubcolombia",
      "ventas_aguila",
      "ventas_poker",
      "ventas_ponymalta",
      "engagement_social",
      "impresiones_totales",
      "roi_campana",
      "costo_adquisicion",
      "tasa_conversion",
      "alcance_total",
    ],
    precio: 500000,
  },
];

// ==================== FUNCIONES DE ALMACENAMIENTO ====================

export const reportConfigStorage = {
  // Inicializar con plantillas y paquetes predefinidos
  initialize: () => {
    if (typeof window === "undefined") return;

    // Inicializar plantillas
    if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    }

    // Inicializar paquetes de servicio
    if (!localStorage.getItem(STORAGE_KEYS.SERVICE_PACKAGES)) {
      localStorage.setItem(
        STORAGE_KEYS.SERVICE_PACKAGES,
        JSON.stringify(DEFAULT_SERVICE_PACKAGES)
      );
    }

    // Inicializar configuraciones de reportes
    if (!localStorage.getItem(STORAGE_KEYS.REPORT_CONFIGS)) {
      localStorage.setItem(STORAGE_KEYS.REPORT_CONFIGS, JSON.stringify([]));
    }

    // Inicializar asignaciones de servicios
    if (!localStorage.getItem(STORAGE_KEYS.COMPANY_SERVICES)) {
      localStorage.setItem(STORAGE_KEYS.COMPANY_SERVICES, JSON.stringify([]));
    }
  },

  // ==================== CONFIGURACIONES DE REPORTES ====================

  getAllConfigurations: (): ReportConfiguration[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.REPORT_CONFIGS);
    return data ? JSON.parse(data) : [];
  },

  getConfigurationByCompany: (empresaId: string): ReportConfiguration | null => {
    const configs = reportConfigStorage.getAllConfigurations();
    return configs.find((c) => c.empresaId === empresaId && c.activa) || null;
  },

  createConfiguration: (
    config: Omit<ReportConfiguration, "id" | "fechaCreacion" | "fechaActualizacion">
  ): ReportConfiguration => {
    const newConfig: ReportConfiguration = {
      ...config,
      id: crypto.randomUUID(),
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
    };

    const configs = reportConfigStorage.getAllConfigurations();

    // Desactivar configuraciones anteriores de la misma empresa
    const updatedConfigs = configs.map((c) =>
      c.empresaId === config.empresaId ? { ...c, activa: false } : c
    );

    updatedConfigs.push(newConfig);
    localStorage.setItem(STORAGE_KEYS.REPORT_CONFIGS, JSON.stringify(updatedConfigs));

    return newConfig;
  },

  updateConfiguration: (
    id: string,
    updates: Partial<ReportConfiguration>
  ): ReportConfiguration | null => {
    const configs = reportConfigStorage.getAllConfigurations();
    const index = configs.findIndex((c) => c.id === id);

    if (index === -1) return null;

    const updatedConfig = {
      ...configs[index],
      ...updates,
      fechaActualizacion: new Date().toISOString(),
    };

    configs[index] = updatedConfig;
    localStorage.setItem(STORAGE_KEYS.REPORT_CONFIGS, JSON.stringify(configs));

    return updatedConfig;
  },

  deleteConfiguration: (id: string): boolean => {
    const configs = reportConfigStorage.getAllConfigurations();
    const filtered = configs.filter((c) => c.id !== id);

    if (filtered.length === configs.length) return false;

    localStorage.setItem(STORAGE_KEYS.REPORT_CONFIGS, JSON.stringify(filtered));
    return true;
  },

  // ==================== PLANTILLAS ====================

  getAllTemplates: (): ReportTemplate[] => {
    if (typeof window === "undefined") return DEFAULT_TEMPLATES;
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return data ? JSON.parse(data) : DEFAULT_TEMPLATES;
  },

  getTemplateById: (id: string): ReportTemplate | null => {
    const templates = reportConfigStorage.getAllTemplates();
    return templates.find((t) => t.id === id) || null;
  },

  createConfigFromTemplate: (
    templateId: string,
    empresaId: string,
    empresaNombre: string
  ): ReportConfiguration | null => {
    const template = reportConfigStorage.getTemplateById(templateId);
    if (!template) return null;

    return reportConfigStorage.createConfiguration({
      empresaId,
      empresaNombre,
      ...template.configuracion,
    });
  },

  // ==================== PAQUETES DE SERVICIO ====================

  getAllServicePackages: (): ServicePackage[] => {
    if (typeof window === "undefined") return DEFAULT_SERVICE_PACKAGES;
    const data = localStorage.getItem(STORAGE_KEYS.SERVICE_PACKAGES);
    return data ? JSON.parse(data) : DEFAULT_SERVICE_PACKAGES;
  },

  getServicePackageById: (id: string): ServicePackage | null => {
    const packages = reportConfigStorage.getAllServicePackages();
    return packages.find((p) => p.id === id) || null;
  },

  // ==================== ASIGNACIONES DE SERVICIOS ====================

  getAllServiceAssignments: (): CompanyServiceAssignment[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY_SERVICES);
    return data ? JSON.parse(data) : [];
  },

  getCompanyServiceAssignment: (empresaId: string): CompanyServiceAssignment | null => {
    const assignments = reportConfigStorage.getAllServiceAssignments();
    return assignments.find((a) => a.empresaId === empresaId && a.activo) || null;
  },

  assignServiceToCompany: (assignment: Omit<CompanyServiceAssignment, "activo">): CompanyServiceAssignment => {
    const newAssignment: CompanyServiceAssignment = {
      ...assignment,
      activo: true,
    };

    const assignments = reportConfigStorage.getAllServiceAssignments();

    // Desactivar asignaciones anteriores de la misma empresa
    const updatedAssignments = assignments.map((a) =>
      a.empresaId === assignment.empresaId ? { ...a, activo: false } : a
    );

    updatedAssignments.push(newAssignment);
    localStorage.setItem(STORAGE_KEYS.COMPANY_SERVICES, JSON.stringify(updatedAssignments));

    return newAssignment;
  },

  // ==================== VALIDACIONES ====================

  validateConfiguration: (
    config: ReportConfiguration,
    empresaId: string
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const assignment = reportConfigStorage.getCompanyServiceAssignment(empresaId);

    if (!assignment) {
      errors.push("La empresa no tiene un paquete de servicio asignado");
      return { valid: false, errors };
    }

    const servicePackage = reportConfigStorage.getServicePackageById(assignment.paqueteId);

    if (!servicePackage) {
      errors.push("Paquete de servicio no encontrado");
      return { valid: false, errors };
    }

    // Validar número de KPIs
    if (config.kpis.length > servicePackage.maxKPIs) {
      errors.push(
        `Excede el límite de KPIs (${config.kpis.length}/${servicePackage.maxKPIs})`
      );
    }

    // Validar número de filas
    if (config.filas.length > servicePackage.maxFilas) {
      errors.push(
        `Excede el límite de filas (${config.filas.length}/${servicePackage.maxFilas})`
      );
    }

    // Validar gráficos por fila
    config.filas.forEach((fila, index) => {
      if (fila.graficos.length > servicePackage.maxGraficosPorFila) {
        errors.push(
          `Fila ${index + 1} excede el límite de gráficos (${fila.graficos.length}/${servicePackage.maxGraficosPorFila})`
        );
      }

      // Validar tipos de gráficos permitidos
      fila.graficos.forEach((grafico) => {
        if (!servicePackage.graficosPermitidos.includes(grafico.tipo)) {
          errors.push(
            `Tipo de gráfico '${grafico.tipo}' no permitido en el paquete actual`
          );
        }
      });

      // Validar fuentes de datos
      fila.graficos.forEach((grafico) => {
        if (!servicePackage.fuentesDatos.includes(grafico.fuente)) {
          errors.push(
            `Fuente de datos '${grafico.fuente}' no permitida en el paquete actual`
          );
        }
      });
    });

    // Validar fuentes de datos de KPIs
    config.kpis.forEach((kpi) => {
      if (!servicePackage.fuentesDatos.includes(kpi.fuente)) {
        errors.push(
          `KPI '${kpi.nombre}' usa fuente de datos no permitida: ${kpi.fuente}`
        );
      }
    });

    return { valid: errors.length === 0, errors };
  },
};
