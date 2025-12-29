// Schema de validación para campañas en Firestore

import { z } from "zod"

export const CampaignStatusSchema = z.enum([
  "planificacion",
  "activa",
  "completada",
  "cancelada",
])

export const CampaignDocSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  empresaId: z.string().min(1, "Empresa requerida"),
  empresaNombre: z.string().min(1, "Nombre de empresa requerido"),
  usuarioResponsableId: z.string().min(1, "Usuario responsable requerido"),
  usuarioResponsableNombre: z.string().min(1, "Nombre de usuario requerido"),
  estado: CampaignStatusSchema,
  fechaInicio: z.string(), // ISO date string
  fechaFin: z.string().refine(
    (date) => date.length > 0,
    "Fecha fin requerida"
  ),
  presupuesto: z.number().nonnegative("El presupuesto no puede ser negativo"),
  descripcion: z.string().min(1, "Descripción requerida"),
  objetivos: z.string().optional(),
  productosAsociados: z.array(z.string()).default([]),
  createdAt: z.any().optional(), // Firestore Timestamp
  updatedAt: z.any().optional(), // Firestore Timestamp
  createdBy: z.string().optional(), // User UID who created
})

export const CampaignImageSchema = z.object({
  id: z.string(),
  url: z.string().url("URL inválida"),
  storagePath: z.string(),
  name: z.string(),
  uploadedAt: z.any(), // Firestore Timestamp
  uploadedBy: z.string(),
  uploadedByName: z.string(),
})

export const CampaignCommentSchema = z.object({
  id: z.string(),
  author: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  text: z.string().min(1, "El comentario no puede estar vacío"),
  timestamp: z.any(), // Firestore Timestamp
})

export type CampaignDoc = z.infer<typeof CampaignDocSchema>
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>
export type CampaignImage = z.infer<typeof CampaignImageSchema>
export type CampaignComment = z.infer<typeof CampaignCommentSchema>
