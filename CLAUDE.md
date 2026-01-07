# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Marketing Analytics Platform** - A full-stack Next.js application for managing marketing campaigns across multiple client companies. Features a three-tier role system (admin/company/employee), real-time analytics dashboards, and microservices-based data import pipeline.

**Tech Stack:** Next.js 16 (App Router) • TypeScript • React 19 • Firebase (Firestore + Auth + Storage) • PostgreSQL • Google Cloud (Storage, Pub/Sub) • Tailwind CSS 4 • shadcn/ui

## Development Commands

**IMPORTANT: This project uses `yarn` as the package manager. Always use `yarn` commands, not `npm`.**

### Main Application

```bash
# Development
yarn dev                 # Start Next.js dev server (http://localhost:3000)
yarn build               # Production build
yarn start               # Run production build
yarn lint                # Run ESLint

# Path aliases available: @/* → root directory
```

### Microservices

Both services use identical commands:

```bash
cd services/import-api       # or services/import-worker
yarn dev                     # tsx watch (hot reload)
yarn build                   # TypeScript compilation
yarn start                   # Run compiled code (node dist/index.js)
```

**import-api**: File upload, Excel parsing, schema validation, GCS signed URLs
**import-worker**: Background Pub/Sub consumer for data transformation and bulk inserts

### Environment Variables

Required in `.env.local`:

```bash
# Firebase Client (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

# Firebase Admin (server-side)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY          # Must include \n for newlines

# Databases
DATABASE_URL                   # PostgreSQL connection string

# Google Cloud
GCS_BUCKET                     # Cloud Storage bucket name

# Microservices
IMPORT_API_BASE_URL           # URL for import-api service
```

## Architecture

### Authentication & Authorization (RBAC)

**Three-Tier Role System:**

```typescript
type UserRole = "admin" | "company" | "employee"
```

- **admin**: Full access including admin panel (`/admin/*`), manages all companies/campaigns
- **company**: Dashboard and campaigns for their organization only
- **employee**: Campaign execution, assigned campaigns only

**Authentication Flow:**

1. Firebase Authentication provides identity
2. `useAuthRole` hook (lib/auth/useAuthRole.ts) fetches role from Firestore
3. Client route guards in layout components (app/admin/layout.tsx, app/dashboard/layout.tsx)
4. Server validation via `requireAdmin` middleware (lib/server/firebase-admin.ts)
5. Firestore security rules enforce data-level access

**Caching:** User role cached 5 minutes to prevent excessive Firestore reads

### Data Layer: Dual Database Strategy

**Firestore (Primary)** - Real-time operational data
- Collections: users, companies, campaigns
- Subcollections: campaigns/{id}/images, campaigns/{id}/comments
- Real-time listeners for dashboard updates
- File metadata and signed URLs

**PostgreSQL (Secondary)** - ETL and import processing
- Import staging tables
- Schema versioning and validation
- Bulk data transformations
- Import audit trail

**Why both?** Firestore optimized for UI reads and real-time updates; PostgreSQL handles complex queries and data imports.

### Component Architecture

**Layered Structure:**

```
Pages (app/*)
  ↓ use
Views (components/views/*)
  ↓ compose
Feature Components (components/admin/*, components/dashboard/*)
  ↓ use
UI Primitives (components/ui/*)
```

**Example:** `/admin/companies/page.tsx` → `CompaniesView` → `CompaniesTable` → `Table`, `Button`, `Dialog`

**State Management:**
- Server state: Direct Firestore queries + real-time listeners
- Client state: react-hook-form (forms), useState (UI state)
- Heavy memoization in dashboard (850+ line component/dashboard.tsx)

### API & Microservices: BFF Pattern

**Next.js API Routes** act as proxy layer:

```
Frontend → Next.js API (app/api/*) → Microservice → Database
```

**Flow:** Next.js handles auth token passthrough, environment security, CORS, request/response transformation

**Microservices Communication:** Google Cloud Pub/Sub for async processing between import-api and import-worker

## Key Patterns

### Role-Based Route Guards

**Client-side** (app/admin/layout.tsx):
```typescript
const { role, loading } = useAuthRole()
if (!loading && role !== "admin") redirect("/dashboard")
```

**Server-side** (lib/server/firebase-admin.ts):
```typescript
export async function requireAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (user.role !== "admin") throw new Error("Unauthorized")
}
```

### Data Import Flow

1. Admin uploads Excel file → `/api/imports` → `import-api` microservice
2. Generate signed GCS URL (15 min expiry)
3. Upload to GCS, store metadata in PostgreSQL
4. Publish message to Pub/Sub topic
5. `import-worker` consumes message
6. Parse Excel → validate against Zod schemas → bulk insert to Firestore
7. Update import status in PostgreSQL

### Firestore Security Rules

**Principle: Least Privilege Access**

```javascript
// Users can only read/write their own document
match /users/{userId} {
  allow read, update: if request.auth.uid == userId;
  allow read, write: if isAdmin();
}

// Companies see only their data
match /campaigns/{campaignId} {
  allow read: if isCompany() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.empresaActualId == resource.data.empresaId;
  allow read: if isEmployee() &&
    resource.data.usuarioResponsableId == request.auth.uid;
  allow read, write: if isAdmin();
}
```

**Helper functions:** `isAdmin()`, `isCompany()`, `isEmployee()`, `getUserRole()`

### Denormalization Strategy

**Pattern:** Strategic denormalization for performance

```typescript
interface Campaign {
  empresaId: string
  empresaNombre: string        // ← Denormalized for display
  usuarioResponsableId: string
  usuarioResponsableNombre: string  // ← Denormalized
}
```

**Trade-off:** Faster reads, slower writes, requires migration scripts when names change

**Migration scripts:** lib/migrations/* handle bulk updates

### File Storage

**Pattern:** Campaign assets in GCS

```
campaigns/{campaignId}/images/{timestamp}_{random}.{ext}
```

**Signed URLs:** Temporary upload URLs (15 min expiry) via `lib/server/gcs.ts`

**Metadata:** Stored in Firestore subcollections for easy querying and permissions

## Important Files

### Authentication
- `lib/auth/useAuthRole.ts` - Role detection hook with 5-min cache
- `lib/server/firebase-admin.ts` - Admin SDK + `requireAdmin` middleware
- `firestore.rules` - Security rules for all collections

### Data Access Layer
- `lib/data/campaigns.ts` - Campaign CRUD operations
- `lib/data/companies.ts` - Company operations
- `lib/data/users.ts` - User operations
- `lib/server/db.ts` - PostgreSQL connection pool
- `lib/server/gcs.ts` - Google Cloud Storage helpers

### Validation
- `lib/schemas/campaign.ts` - Campaign Zod schemas
- `lib/schemas/company.ts` - Company Zod schemas
- `lib/schemas/user.ts` - User Zod schemas

Used for: form validation (react-hook-form), API validation, TypeScript types (z.infer)

### Migrations
- `lib/migrations/migrate-campaigns.ts` - Campaign data migrations
- `lib/migrations/migrate-companies.ts` - Company data migrations
- `lib/migrations/migrate-user-productos.ts` - User product data migrations

Run these when denormalized fields need bulk updates.

### Key Components
- `components/dashboard.tsx` - Main analytics dashboard (850+ lines, heavily memoized)
- `components/admin/admin-layout.tsx` - Admin sidebar navigation
- `components/app-sidebar.tsx` - Main app navigation
- `components/admin/create-campaign-modal.tsx` - Campaign creation with validation
- `components/admin/companies-table.tsx` - Company management table

## Database Schema Notes

**Firestore Collections:**
- `users/{userId}` - role, empresaActualId, profile data
- `companies/{companyId}` - nombre, tipo, tamaño, productos, estado
- `campaigns/{campaignId}` - nombre, empresaId, empresaNombre (denorm), presupuesto, estado, fechaInicio, fechaFin, usuarioResponsableId, usuarioResponsableNombre (denorm), bucketPath

**Subcollections:**
- `campaigns/{id}/images/{imageId}` - url, storagePath, uploadedBy, timestamp
- `campaigns/{id}/comments/{commentId}` - text, author, timestamp

**PostgreSQL Tables:**
- Import staging and processing tables
- Schema versioning
- Import audit logs

## Next.js Configuration Notes

- **Build errors ignored:** `next.config.mjs` has `typescript: { ignoreBuildErrors: true }` for development speed
- **Path aliases:** `@/*` maps to root directory
- **Deployment:** Configured for Vercel
- **Analytics:** Vercel Analytics integrated

## Security Considerations

**Multi-Layer Security:**
1. Firebase Authentication (identity)
2. Firestore Security Rules (data access)
3. Client route guards (UX)
4. Server middleware (API protection)
5. Zod validation (data integrity)

**Important:** When making changes to authentication or authorization:
1. Update Firestore rules in `firestore.rules`
2. Update client guards in layout components
3. Update server middleware if needed
4. Test all three role types (admin, company, employee)

## Migration Workflow

When updating denormalized fields (e.g., company name):

1. Update the source record (e.g., company document)
2. Run appropriate migration script from `lib/migrations/*`
3. Verify data consistency across all affected documents

Example: Renaming a company requires migrating all campaigns with that `empresaId` to update `empresaNombre`.
