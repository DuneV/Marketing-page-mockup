# Bavaria Marketing Analytics Platform

Plataforma completa de análisis de marketing diseñada para Bavaria que permite a administradores gestionar múltiples empresas clientes y sus campañas de marketing.

## Descripción General

Esta aplicación es una plataforma de marketing analytics donde un administrador (usuario employee con privilegios especiales) puede gestionar cuentas de múltiples empresas clientes. Cada empresa puede acceder a su propio dashboard, gestionar campañas y ver métricas de rendimiento.

**Propósito:** Permitir a una empresa de marketing analytics gestionar y monitorear las campañas de múltiples clientes empresariales desde una interfaz centralizada.

## Características Principales

- **Panel de Administración**: Gestión completa de empresas clientes con métricas en tiempo real
- **Dashboard Interactivo**: Visualización de KPIs, gráficos y métricas de campañas
- **Gestión de Campañas**: Seguimiento y análisis de campañas de marketing
- **Sistema de Roles**: Tres tipos de usuarios con diferentes niveles de acceso
- **Modo Oscuro**: Soporte completo para tema claro/oscuro
- **Responsive**: Diseño adaptable a móviles, tablets y desktop

## Stack Tecnológico

- **Framework**: Next.js 16.0.7 (App Router)
- **UI Library**: React 19.2.0
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4.1.9
- **Componentes UI**: shadcn/ui con Radix UI
- **Formularios**: react-hook-form 7.60.0 + Zod 3.25.76
- **Gráficos**: Recharts
- **Iconos**: Lucide React 0.454.0
- **Tema**: next-themes

## Arquitectura de Autenticación

La aplicación utiliza un sistema de autenticación basado en localStorage (apropiado para demo/mockup).

### Roles de Usuario

1. **Employee (Empleado)**
   - Usuario regular de la empresa de marketing analytics
   - Acceso a: Dashboard, Campañas, Configuración
   - NO tiene acceso a panel de administración

2. **Company (Empresa)**
   - Cliente/empresa que usa la plataforma
   - Acceso a: Dashboard, Campañas, Configuración
   - Puede ver sus propias métricas y campañas

3. **Admin (Administrador)**
   - Employee con privilegio especial (`isAdmin: true`)
   - Acceso a: Dashboard, Campañas, Configuración, **Panel Admin**
   - Puede gestionar todas las empresas clientes

### Estructura del Objeto de Usuario

```typescript
{
  email: string
  authenticated: boolean
  userType: "employee" | "company"
  isAdmin: boolean
  timestamp: number
  name?: string
}
```

## Modelos de Datos

### Company (Empresa Cliente)

```typescript
interface Company {
  id: string              // UUID v4
  nombre: string          // Nombre de la empresa
  tamaño: "pequeño" | "mediano" | "grande" | "enterprise"
  tipo: string            // Industria/sector (ej: Distribución, Retail)
  productos: string[]     // Lista de productos que manejan
  cantidad: number        // Cantidad de productos
  username: string        // Usuario de acceso
  contraseña: string      // Contraseña (hash en producción)
  estado: "activa" | "inactiva"
  fechaCreacion: string   // ISO date string
  totalCampañas?: number  // Total de campañas ejecutadas
  inversionTotal?: number // Inversión total en COP
}
```

## Páginas y Rutas

### Rutas Públicas
- `/auth/login` - Página de inicio de sesión con selección de rol

### Rutas Protegidas (requieren autenticación)
- `/dashboard` - Dashboard principal con KPIs y gráficos (todos los usuarios)
- `/campaigns` - Gestión de campañas de marketing (todos los usuarios)
- `/settings` - Configuración de usuario (todos los usuarios)
- `/admin` - **Panel de Administración** (solo admin)

## Características del Panel Admin (`/admin`)

El panel de administración es accesible solo para usuarios con `userType: "employee"` Y `isAdmin: true`.

### KPIs Principales
- **Total de Empresas**: Cantidad total de empresas clientes registradas
- **Empresas Activas**: Número de empresas con estado "activa"
- **Total Campañas**: Suma de todas las campañas de todas las empresas
- **Inversión Total**: Suma de inversiones en formato COP (Pesos Colombianos)

### Funcionalidades

#### Crear Empresa
- Modal con formulario validado (react-hook-form + zod)
- Campos: nombre, tipo, tamaño, productos, cantidad, username, contraseña, estado
- Validaciones en tiempo real
- Generación automática de UUID y fecha de creación

#### Eliminar Empresa
- Confirmación mediante dialog antes de eliminar
- Eliminación permanente de localStorage
- Actualización automática de métricas

#### Tabla de Empresas
Muestra todas las empresas con:
- Nombre
- Tamaño (badge con colores)
- Tipo/Industria
- Cantidad de productos
- Estado (activa/inactiva)
- Fecha de creación
- Acciones (eliminar)

### Datos Mock

La aplicación incluye 5 empresas de ejemplo:

1. **Distribuidora Central** (Grande, Activa)
   - 3 productos, 24 campañas, $450,000 COP

2. **SuperMercados del Norte** (Mediano, Activo)
   - 2 productos, 15 campañas, $280,000 COP

3. **Comercializadora Express** (Pequeño, Activa)
   - 1 producto, 8 campañas, $120,000 COP

4. **Grupo Empresarial Bavaria** (Enterprise, Activa)
   - 4 productos, 42 campañas, $850,000 COP

5. **Tiendas la Esquina** (Pequeño, Inactiva)
   - 1 producto, 3 campañas, $45,000 COP

## Desarrollo

### Requisitos Previos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>

# Instalar dependencias
npm install
# o
yarn install

# Ejecutar en modo desarrollo
npm run dev
# o
yarn dev

# Abrir navegador
http://localhost:3000
```

### Credenciales Demo

Usa estas credenciales para probar la aplicación:

| Tipo | Email | Contraseña | Acceso |
|------|-------|-----------|--------|
| Empleado | empleado@bavaria.com | password123 | Dashboard, Campañas, Configuración |
| Empresa | empresa@bavaria.com | password123 | Dashboard, Campañas, Configuración |
| **Admin** | **admin@bavaria.com** | **password123** | **Todo + Panel Admin** |

### Build para Producción

```bash
# Crear build optimizado
npm run build

# Ejecutar build
npm start
```

## Estructura del Proyecto

```
/
├── app/                        # Next.js App Router
│   ├── auth/login/            # Página de login
│   ├── dashboard/             # Dashboard principal
│   ├── campaigns/             # Gestión de campañas
│   ├── settings/              # Configuración
│   └── admin/                 # Panel de administración
│
├── components/
│   ├── admin/                 # Componentes específicos de admin
│   │   ├── admin-kpi-card.tsx
│   │   ├── companies-table.tsx
│   │   ├── create-company-modal.tsx
│   │   └── delete-company-dialog.tsx
│   ├── dasboard/              # Componentes de dashboard
│   │   ├── useUser.ts         # Hook de usuario
│   │   └── ProtectedRoute.tsx # Protección de rutas
│   ├── views/                 # Vistas principales
│   │   ├── admin-view.tsx
│   │   └── ...
│   ├── ui/                    # shadcn/ui components
│   ├── app-sidebar.tsx        # Barra lateral de navegación
│   ├── dashboard-layout.tsx   # Layout principal
│   └── ...
│
├── lib/
│   ├── companies-storage.ts   # Utilidades de localStorage
│   └── utils.ts               # Utilidades generales
│
├── types/
│   └── company.ts             # Tipos TypeScript
│
└── README.md                  # Este archivo
```

## Persistencia de Datos

Todos los datos se almacenan en localStorage del navegador:

- **Key: `"user"`** - Sesión del usuario actual
- **Key: `"companies"`** - Array de empresas clientes

### Reiniciar Datos

Para reiniciar todos los datos a los valores iniciales:

```javascript
// En la consola del navegador
localStorage.clear()
// Recargar la página
```

## Guía de Estilos

### Esquema de Colores

- **Primary**: Amber-600 (#D97706)
- **Secondary**: Red-600 (#DC2626)
- **Success**: Green-600 (#16A34A)
- **Background Light**: White / Slate-50
- **Background Dark**: Slate-950 / Slate-900

### Patrones de Componentes

- **Cards**: `rounded-lg` con `border` y `shadow`
- **Tablas**: Hover states en filas
- **Botones**: Colores según contexto (amber primary, red secondary/delete)
- **Badges**: Colores semánticos según estado
- **Dark Mode**: Soporte completo en todos los componentes

## Notas de Seguridad

⚠️ **IMPORTANTE**: Esta es una aplicación de demostración/mockup:

- Las contraseñas se almacenan en texto plano en localStorage
- No hay encriptación de datos
- No hay backend real ni autenticación segura
- Los datos persisten solo en el navegador
- **NO apto para uso en producción**

### Para Producción se Requiere:

1. **Backend Authentication**
   - Implementar API backend con JWT/OAuth
   - Hash de contraseñas (bcrypt, argon2)
   - Tokens de sesión seguros

2. **Base de Datos**
   - PostgreSQL, MongoDB o similar
   - Migraciones y schemas
   - Backups automáticos

3. **Seguridad**
   - HTTPS obligatorio
   - CORS configurado
   - Rate limiting
   - Validación server-side
   - Protección CSRF

4. **Infraestructura**
   - Deploy en Vercel, AWS, o similar
   - CDN para assets
   - Logs y monitoring
   - CI/CD pipeline

## Contribuir

Este es un proyecto de demostración. Para modificaciones:

1. Sigue los patrones de componentes existentes
2. Mantén los tipos TypeScript actualizados
3. Usa componentes de shadcn/ui cuando sea posible
4. Sigue las convenciones de Tailwind CSS
5. Prueba en modo claro y oscuro
6. Verifica responsive design

## Licencia

Este proyecto es para fines demostrativos.

## Contacto y Soporte

Para preguntas o soporte, contacta al equipo de desarrollo.

---

**Versión**: 1.0.0
**Última actualización**: Diciembre 2024
**Desarrollado con**: ❤️ y Next.js
