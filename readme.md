# 🍺 Bavaria Marketing Campaign Dashboard

Este proyecto es una interfaz web interactiva diseñada para la visualización de métricas de rendimiento de campañas de marketing para **Bavaria**.

El objetivo principal es proveer un tablero de control (Dashboard) limpio y moderno que permita a los stakeholders visualizar KPIs, tendencias de engagement y distribución de presupuesto de marcas como Águila, Poker y Club Colombia.

## 🚀 Características Principales

* **Diseño Modular:** La arquitectura está desacoplada. Cada visualización de datos vive en su propio componente independiente para facilitar el mantenimiento y la escalabilidad.
* **Visualización de Datos:** Implementación de gráficos interactivos (Barras, Líneas, Dona) utilizando `Recharts`.
* **Interfaz Moderna:** Estilizado con `Tailwind CSS` siguiendo los lineamientos de diseño corporativo (sobrio y profesional).
* **KPIs en Tiempo Real:** Tarjetas de resumen para ROI, Inversión Total y Alcance.
* **Responsive:** Diseño adaptable a dispositivos de escritorio y tabletas.

## 🛠️ Stack Tecnológico

* **Framework:** React (Next.js / Vite)
* **Estilos:** Tailwind CSS
* **Gráficos:** Recharts
* **Iconografía:** Lucide React
* **Componentes UI:** shadcn/ui (base para tarjetas y botones)

## 📂 Estructura del Proyecto

El proyecto sigue una filosofía de **"Un componente por gráfica"** para mantener la lógica simple y legible:

```text
src/
├── components/
│   ├── dashboard/
│   │   ├── KPICards.tsx         # Tarjetas de métricas superiores
│   │   ├── SalesBarChart.tsx    # Gráfica de Ventas por Marca
│   │   ├── TrendLineChart.tsx   # Gráfica de Tendencia de Engagement
│   │   ├── ChannelPieChart.tsx  # Gráfica de Distribución por Canal
│   │   └── DateFilter.tsx       # Componente de filtro de fecha
│   └── ui/                      # Componentes base (Botones, Cards)
├── pages/
│   └── index.tsx                # Layout principal que importa los componentes
└── data/
    └── mock-data.json           # Datos simulados de la campaña