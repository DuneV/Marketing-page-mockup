// Schema de validación para campañas en Firestore

import { z } from "zod"

export const CampaignStatusSchema = z.enum([
  "planificacion",
  "activa",
  "completada",
  "cancelada",
])
export const CampaignDocSchema = z.object({
  nombre: z.string(),
  empresaId: z.string(),
  empresaNombre: z.string(),
  usuarioResponsableId: z.string(),
  usuarioResponsableNombre: z.string(),
  estado: z.enum(["planificacion", "activa", "completada", "cancelada"]),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  presupuesto: z.number(),
  descripcion: z.string(),
  objetivos: z.string().optional(),
  productosAsociados: z.array(z.string()),
  bucketPath: z.string().optional(), // ✅ Ruta del bucket GCS para la campaña
  createdAt: z.any(),
  updatedAt: z.any(),
  createdBy: z.string(),
})

export type CampaignDoc = z.infer<typeof CampaignDocSchema>

export const CampaignImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  storagePath: z.string(),
  name: z.string(),
  uploadedAt: z.union([z.string(), z.date()]),
  uploadedBy: z.string(),
  uploadedByName: z.string(),
})

export type CampaignImage = z.infer<typeof CampaignImageSchema>

export const CampaignCommentSchema = z.object({
  id: z.string(),
  author: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  text: z.string(),
  timestamp: z.union([z.string(), z.date()]),
})

export type CampaignComment = z.infer<typeof CampaignCommentSchema>

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>
