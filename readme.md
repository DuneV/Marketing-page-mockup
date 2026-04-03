# Marketing Campaign Dashboard Platform

Plataforma de gestión y visualización de campañas de marketing con importación de datos Excel, configuración de dashboards interactivos y galería de evidencias fotográficas.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  /admin/campaigns  ·  /dashboard  ·  /company           │
└───────────────┬─────────────────────────────────────────┘
                │ API Routes (/api/*)
                │ (passthrough proxy)
        ┌───────▼────────┐        ┌──────────────────┐
        │   import-api   │        │     Firebase      │
        │  (Express.js)  │        │  Firestore + GCS  │
        └───────┬────────┘        └──────────────────┘
                │
        ┌───────▼────────┐
        │   PostgreSQL   │
        │ imports schema │
        │ staging schema │
        └────────────────┘
```

### Servicios

| Servicio | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Next.js 14 + TypeScript | UI admin, company, dashboard viewer |
| import-api | Express.js + TypeScript | Imports, reportes, datasets |
| Base de datos | PostgreSQL | Staging rows, mappings, imports |
| Auth & Datos | Firebase (Firestore) | Campañas, empresas, usuarios |
| Archivos | Google Cloud Storage | Excel uploads, assets (imágenes hero) |

---

## Módulos principales

### 1. Gestión de Campañas (`/admin/campaigns`)

CRUD completo de campañas con roles:

- **Admin**: ve y gestiona todas las campañas
- **Company**: ve solo las campañas de su empresa

Cada campaña tiene: nombre, empresa, estado, fechas, descripción, objetivos, productos asociados y `bucketPath` en GCS.

### 2. Importación de datos Excel

Flujo de importación en dos modalidades:

**Flujo manual (nueva campaña o primer import):**
1. Descargar plantilla `.xlsx` para la empresa
2. Seleccionar archivo o cargar desde Google Sheets via URL
3. Subir y analizar (detecta columnas, sugiere mapeo)
4. Confirmar mapeo → encola procesamiento en background

**Flujo automático (actualización):**
- "Actualizar Excel (auto)" reemplaza el import anterior del slot y reutiliza el mapeo guardado sin intervención manual

#### Slots de datos

Un import puede pertenecer a un **slot** (`source_label`). Esto permite múltiples fuentes de datos para la misma campaña:

```
campaña X
  ├── slot: primary    ← datos principales (ej: visitas)
  └── slot: compras    ← datos secundarios (ej: transacciones)
```

Los KPIs y constantes operan sobre **todos los slots combinados**. Los gráficos declaran su slot en `sourceLabel` para usar solo esa fuente.

Los slots adicionales (no `primary`) pueden eliminarse desde el detalle de la campaña sin afectar el slot principal.

#### Mapeo de columnas

El mapeo `columna Excel → campo canónico` se guarda por campaña y slot en Firestore (`columnMapping.{sourceLabel}`). En uploads futuros se restaura automáticamente.

### 3. Builder de reportes (`ReportConfigBuilderCampaign`)

Constructor visual de dashboards guardado como JSON en GCS (`report-configs/campaigns/{campaignId}.json`).

#### KPIs

Tres tipos de KPI:

| Tipo | Descripción | Ejemplo |
|---|---|---|
| `field` | Agrega un campo numérico o cuenta filas | `sum(unidades_entregadas)` |
| `formula` | Opera sobre dos KPIs o constantes (A op B) | `Ventas / Meta (%)` |
| `expression` | Expresión libre con `[Campo]`, `{const_key}`, `{kpi:id}` | `[campo1] + {const_1} * 0.5` |

Opciones por KPI: formato (número/moneda/porcentaje), decimales, unidad, visibilidad, columnas en grid (1-12), filtro de categoría (pre-filtra filas antes de agregar), escala al usar en fórmulas.

#### Constantes

Valores reutilizables en expresiones y fórmulas:

- **Estáticas**: número fijo
- **Agregado con filtro**: calcula en runtime sobre los datos filtrados, ej. `sum(unidades_entregadas) donde ciudad = "CALI"`

#### Gráficos

Organizados en filas con altura configurable. Tipos disponibles:

`torta · barras · spline · area · scatter · radar · funnel · gauge · heatmap · treemap · tabla · combo`

Cada gráfico soporta: group by, series by, múltiples métricas con eje left/right, orientación, modo stacked/grouped, línea de referencia KPI, colores extra, anchos de columna (para tablas), y click-to-filter en barras y torta.

#### Branding

- Hero image (upload a GCS o URL externa), título, subtítulo, color de texto, overlay, altura
- Estilos de KPIs, gráficos y filtros (color de fondo, texto, border radius)
- Galería de evidencias: campos de fotos, campos de metadata, etiquetas personalizadas, columnas del grid

### 4. Dashboard viewer (`DashboardFromConfig`)

Renderiza la configuración guardada sobre los datos reales del dataset:

- **Filtros interactivos**: fecha inicio/fin + condiciones dinámicas por campo. Dropdowns para ≤10 opciones, combobox con regex para >10 opciones
- **KPIs**: se recalculan al aplicar filtros (incluyendo constantes `filtered_agg`)
- **Gráficos**: click en barra o sector de torta filtra el dashboard completo
- **Galería de evidencias**: viewer con thumbnails, zoom, metadata, navegación por flechas. Compatible con URLs de Google Drive
- **Multi-slot**: cada gráfico usa su slot declarado; KPIs combinan todos los slots

---

## Estructura de archivos relevantes

```
├── app/
│   ├── admin/campaigns/          # Página de gestión (admin)
│   └── api/
│       ├── campaigns/[campaignId]/
│       │   ├── available-fields/
│       │   ├── dataset/
│       │   ├── filter-options/
│       │   ├── imports/
│       │   │   ├── route.ts          # GET/DELETE imports
│       │   │   └── slot/[sourceLabel]/route.ts  # DELETE slot
│       │   ├── latest-import/
│       │   └── report-config/
│       └── imports/[id]/
│           ├── analyze/
│           ├── commit/
│           └── commit-from-previous/
│
├── components/
│   ├── admin/
│   │   ├── campaigns-admin-view.tsx      # Vista principal con tabla y KPIs
│   │   ├── campaigns-table.tsx           # Tabla con acciones
│   │   ├── campaign-detail-modal.tsx     # Detail: detalles, info, excel, mapeo
│   │   ├── create-campaign-modal.tsx     # Wizard 2 pasos: campaña + excel
│   │   ├── edit-campaign-modal.tsx       # Edición de campaña existente
│   │   └── report-config-builder-campaign.tsx  # Builder de dashboard
│   └── views/
│       └── dashboard-from-config.tsx     # Renderer del dashboard
│
├── lib/
│   ├── api/
│   │   ├── campaignApi.ts      # getAvailableFields, dataset, report-config, etc.
│   │   └── importApi.ts        # createImport, analyze, commit, replace, etc.
│   └── data/
│       └── campaigns.ts        # CRUD Firestore + saveCampaignColumnMapping
│
└── services/import-api/
    └── src/routes/
        ├── campaigns.ts        # available-fields, dataset, run-report, report-config, slots
        └── imports.ts          # create, analyze, commit, commit-from-previous
```

---

## Roles y acceso

| Rol | Acceso |
|---|---|
| `admin` | Todo: todas las empresas, campañas, imports, builder |
| `company` | Solo campañas de su `companyId`, dashboard viewer, sin builder |

La verificación ocurre en `import-api` via `requireAdmin` / `requireAuth` + validación de `companyId`.

---

## Variables de entorno

### Next.js (frontend)
```env
NEXT_PUBLIC_API_URL=          # Base URL del import-api (opcional, usa rutas relativas)
IMPORT_API_BASE_URL=          # URL interna del import-api (para API routes)
```

### import-api (backend)
```env
DATABASE_URL=                 # PostgreSQL connection string
GCS_BUCKET=                   # Nombre del bucket de GCS
FIREBASE_PROJECT_ID=          # Firebase project
CORS_ORIGIN=                  # Orígenes permitidos (comma-separated)
PORT=8080
```

---

## Esquema de base de datos (PostgreSQL)

```sql
-- imports.imports
id, company_id, campaign_id, import_type, schema_version,
uploaded_by, original_filename, gcs_uri, status,
source_label,   -- slot: "primary", "compras", etc.
created_at, updated_at, summary

-- imports.import_mappings
import_id, source_column, canonical_field

-- imports.import_schemas
import_type, version, canonical_fields (JSONB)

-- staging.staging_rows
import_id, row_number, data (JSONB), is_valid
```

---

## Flujo de datos completo

```
Usuario sube Excel
      │
      ▼
createImport() → POST /imports
      │  Crea registro UPLOADED en PostgreSQL + signed URL de GCS
      ▼
PUT signed URL → GCS
      │  Sube el archivo binario
      ▼
analyzeImport() → POST /imports/:id/analyze
      │  Lee Excel desde GCS, detecta columnas, sugiere mapeo
      ▼
commitImport() → POST /imports/:id/commit
      │  Guarda mappings + encola en PubSub
      ▼
Worker procesa → lee GCS, aplica mapping, inserta en staging_rows
      │
      ▼
Dashboard lee staging_rows vía GET /campaigns/:id/dataset
      │  Devuelve { rows, dataBySlot }
      ▼
DashboardFromConfig renderiza KPIs + gráficos en el browser
```

---

## Filtros del dashboard

Los filtros se aplican en el cliente sobre el dataset completo (`dataBySlot`):

- Los **KPIs y constantes** usan todos los slots combinados y filtrados
- Los **gráficos** usan el slot declarado en `sourceLabel` con los mismos filtros aplicados
- Las **constantes `filtered_agg`** re-calculan con los filtros activos del usuario (ej: si filtras `ciudad = BARRANQUILLA`, la constante de Cali da 0)
- Quitar un filtro dinámico con la ✕ aplica inmediatamente sin necesidad de hacer click en "Aplicar"

---

## Notas de desarrollo

- Los `SelectItem` de dropdowns globales (KPIs, constantes, galería) usan `uniqueFields` deduplicado por nombre para evitar duplicados cuando hay múltiples slots con campos del mismo nombre
- Los dropdowns de gráficos usan `chartAvailableFields` filtrado por el `sourceLabel` del chart
- El slot `primary` no puede eliminarse desde el UI
- `mergeColumnMappings` en `lib/data/campaigns.ts` combina el mapeo guardado con las sugerencias del análisis para re-uploads
