/**
 * Script para inicializar datos de demostración del sistema de reportes configurables
 *
 * Uso: Importar y ejecutar initDemoData() desde cualquier componente o página
 */

import { reportConfigStorage } from "./report-config-storage";
import { CompaniesStorage } from "./companies-storage";

export function initDemoData() {
  // Inicializar storage
  reportConfigStorage.initialize();
  CompaniesStorage.initialize();

  const companies = CompaniesStorage.getAll();

  if (companies.length === 0) {
    console.warn("No hay empresas para configurar. Ejecuta CompaniesStorage.initialize() primero.");
    return;
  }

  // 1. Asignar paquetes a empresas existentes
  console.log("Asignando paquetes de servicio a empresas...");

  // Distribuidora Central - Paquete Enterprise (es grande)
  const distribuidora = companies.find((c) => c.nombre.includes("Distribuidora Central"));
  if (distribuidora) {
    reportConfigStorage.assignServiceToCompany({
      empresaId: distribuidora.id,
      paqueteId: "paquete-enterprise",
      fechaInicio: new Date().toISOString(),
    });
    console.log("✓ Distribuidora Central → Paquete Enterprise");
  }

  // SuperMercados del Norte - Paquete Profesional (es mediano)
  const superMercados = companies.find((c) => c.nombre.includes("SuperMercados"));
  if (superMercados) {
    reportConfigStorage.assignServiceToCompany({
      empresaId: superMercados.id,
      paqueteId: "paquete-profesional",
      fechaInicio: new Date().toISOString(),
    });
    console.log("✓ SuperMercados del Norte → Paquete Profesional");
  }

  // Comercializadora Express - Paquete Básico (es pequeño)
  const comercializadora = companies.find((c) => c.nombre.includes("Comercializadora"));
  if (comercializadora) {
    reportConfigStorage.assignServiceToCompany({
      empresaId: comercializadora.id,
      paqueteId: "paquete-basico",
      fechaInicio: new Date().toISOString(),
    });
    console.log("✓ Comercializadora Express → Paquete Básico");
  }

  // Grupo Empresarial Bavaria - Paquete Enterprise
  const bavaria = companies.find((c) => c.nombre.includes("Bavaria"));
  if (bavaria) {
    reportConfigStorage.assignServiceToCompany({
      empresaId: bavaria.id,
      paqueteId: "paquete-enterprise",
      fechaInicio: new Date().toISOString(),
    });
    console.log("✓ Grupo Empresarial Bavaria → Paquete Enterprise");
  }

  // Tiendas la Esquina - Paquete Básico (es pequeño e inactivo)
  const tiendas = companies.find((c) => c.nombre.includes("Tiendas"));
  if (tiendas) {
    reportConfigStorage.assignServiceToCompany({
      empresaId: tiendas.id,
      paqueteId: "paquete-basico",
      fechaInicio: new Date().toISOString(),
    });
    console.log("✓ Tiendas la Esquina → Paquete Básico");
  }

  // 2. Crear configuraciones de reportes usando plantillas
  console.log("\nCreando configuraciones de reportes...");

  // Distribuidora Central - Reporte Ejecutivo
  if (distribuidora) {
    reportConfigStorage.createConfigFromTemplate(
      "template-ejecutivo",
      distribuidora.id,
      distribuidora.nombre
    );
    console.log("✓ Distribuidora Central → Reporte Ejecutivo");
  }

  // SuperMercados del Norte - Reporte Ejecutivo
  if (superMercados) {
    reportConfigStorage.createConfigFromTemplate(
      "template-ejecutivo",
      superMercados.id,
      superMercados.nombre
    );
    console.log("✓ SuperMercados del Norte → Reporte Ejecutivo");
  }

  // Comercializadora Express - Reporte Básico
  if (comercializadora) {
    reportConfigStorage.createConfigFromTemplate(
      "template-basico",
      comercializadora.id,
      comercializadora.nombre
    );
    console.log("✓ Comercializadora Express → Reporte Básico");
  }

  // Grupo Empresarial Bavaria - Reporte Ejecutivo Personalizado
  if (bavaria) {
    const config = reportConfigStorage.createConfiguration({
      empresaId: bavaria.id,
      empresaNombre: bavaria.nombre,
      filtros: {
        fechas: {
          inicio: "2024-01-01",
          fin: "2024-12-31",
        },
      },
      kpis: [
        {
          id: crypto.randomUUID(),
          nombre: "Ventas Totales Club Colombia",
          operacion: "sum",
          fuente: "ventas_clubcolombia",
          descripcion: "Suma de todas las ventas de Club Colombia",
        },
        {
          id: crypto.randomUUID(),
          nombre: "Ventas Totales Águila",
          operacion: "sum",
          fuente: "ventas_aguila",
          descripcion: "Suma de todas las ventas de Águila",
        },
        {
          id: crypto.randomUUID(),
          nombre: "ROI Promedio",
          operacion: "mean",
          fuente: "roi_campana",
          descripcion: "Retorno de inversión promedio",
        },
        {
          id: crypto.randomUUID(),
          nombre: "Alcance Total",
          operacion: "sum",
          fuente: "alcance_total",
          descripcion: "Alcance total de todas las campañas",
        },
        {
          id: crypto.randomUUID(),
          nombre: "Tasa Conversión Promedio",
          operacion: "mean",
          fuente: "tasa_conversion",
          descripcion: "Tasa de conversión promedio",
        },
      ],
      filas: [
        {
          id: crypto.randomUUID(),
          orden: 1,
          graficos: [
            {
              id: crypto.randomUUID(),
              tipo: "barras",
              titulo: "Ventas Club Colombia",
              fuente: "ventas_clubcolombia",
              columnas: 6,
              configuracion: {
                showLegend: true,
                showGrid: true,
                height: 300,
              },
            },
            {
              id: crypto.randomUUID(),
              tipo: "barras",
              titulo: "Ventas Águila",
              fuente: "ventas_aguila",
              columnas: 6,
              configuracion: {
                showLegend: true,
                showGrid: true,
                height: 300,
              },
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          orden: 2,
          graficos: [
            {
              id: crypto.randomUUID(),
              tipo: "spline",
              titulo: "Tendencia de ROI",
              fuente: "roi_campana",
              columnas: 12,
              configuracion: {
                showLegend: true,
                showGrid: true,
                height: 300,
              },
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          orden: 3,
          graficos: [
            {
              id: crypto.randomUUID(),
              tipo: "torta",
              titulo: "Distribución de Engagement",
              fuente: "engagement_social",
              columnas: 4,
              configuracion: {
                height: 300,
              },
            },
            {
              id: crypto.randomUUID(),
              tipo: "area",
              titulo: "Alcance Total",
              fuente: "alcance_total",
              columnas: 8,
              configuracion: {
                showLegend: true,
                showGrid: true,
                height: 300,
              },
            },
          ],
        },
      ],
      activa: true,
    });
    console.log("✓ Grupo Empresarial Bavaria → Reporte Personalizado");
  }

  console.log("\n✅ Datos de demostración inicializados correctamente!");
  console.log("\nPara ver los resultados:");
  console.log("1. Inicia sesión como admin (admin@bavaria.com / password123)");
  console.log("2. Ve a /admin");
  console.log("3. Haz clic en 'Vista Previa' para ver los dashboards configurados");
}

// Función para resetear todos los datos de reportes
export function resetReportData() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("report_configurations");
  localStorage.removeItem("company_service_assignments");

  console.log("✅ Datos de reportes reseteados. Ejecuta initDemoData() para volver a inicializar.");
}

// Función para obtener estadísticas
export function getReportStats() {
  const configs = reportConfigStorage.getAllConfigurations();
  const assignments = reportConfigStorage.getAllServiceAssignments();
  const packages = reportConfigStorage.getAllServicePackages();

  console.log("📊 Estadísticas del Sistema de Reportes");
  console.log("=====================================");
  console.log(`Configuraciones activas: ${configs.filter((c) => c.activa).length}`);
  console.log(`Configuraciones totales: ${configs.length}`);
  console.log(`Empresas con paquete asignado: ${assignments.filter((a) => a.activo).length}`);
  console.log(`Paquetes disponibles: ${packages.length}`);
  console.log("\nPaquetes en uso:");

  packages.forEach((pkg) => {
    const count = assignments.filter((a) => a.paqueteId === pkg.id && a.activo).length;
    if (count > 0) {
      console.log(`  - ${pkg.nombre}: ${count} empresa(s)`);
    }
  });
}
