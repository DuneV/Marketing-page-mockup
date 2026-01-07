// types/campaign.ts

export interface Campaign {
  id: string
  nombre: string
  empresaId: string
  empresaNombre: string // Denormalized for display
  usuarioResponsableId: string
  usuarioResponsableNombre: string // Denormalized for display
  estado: "planificacion" | "activa" | "completada" | "cancelada"
  fechaInicio: string
  fechaFin: string
  presupuesto: number
  descripcion: string
  objetivos?: string
  productosAsociados: string[]
  bucketPath?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  // Computed fields
  imageCount?: number
  commentCount?: number
}

export interface CampaignFormData {
  nombre: string
  empresaId: string
  usuarioResponsableId: string
  estado: "planificacion" | "activa" | "completada" | "cancelada"
  fechaInicio: string
  fechaFin: string
  presupuesto: number
  descripcion: string
  objetivos?: string
  productosAsociados: string[]
  bucketPath?: string // ✅ Opcional al crear, se genera automáticamente si no se proporciona
}

export interface CampaignImage {
  id: string
  url: string
  storagePath: string
  name: string
  uploadedAt: string
  uploadedBy: string
  uploadedByName: string
}

export interface CampaignComment {
  id: string
  author: string
  authorName: string
  authorRole: string
  text: string
  timestamp: string
}

export interface CampaignFilters {
  estado?: string
  empresaId?: string
  usuarioResponsableId?: string
  fechaInicio?: string
  fechaFin?: string
}

export interface CampaignStats {
  total: number
  porEstado: {
    planificacion: number
    activa: number
    completada: number
    cancelada: number
  }
  presupuestoTotal: number
  presupuestoPromedio: number
}