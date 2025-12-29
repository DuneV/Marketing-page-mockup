// lib/schemas/company.ts

import { z } from "zod"

export const CompanySizeSchema = z.enum(["pequeño", "mediano", "grande", "enterprise"])

export const CompanyStatusSchema = z.enum(["activa", "inactiva"])

export const CompanyDocSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  tamaño: CompanySizeSchema,
  tipo: z.string().min(2, "Tipo requerido"),
  productos: z.array(z.string()).default([]),
  cantidad: z.number().int().nonnegative("Debe ser un número positivo"),
  username: z.string().min(3, "Mínimo 3 caracteres"),
  contraseña: z.string().min(6, "Mínimo 6 caracteres"),
  estado: CompanyStatusSchema,
  fechaCreacion: z.string().optional(), // ISO date string
  totalCampañas: z.number().int().nonnegative().default(0),
  inversionTotal: z.number().nonnegative().default(0),
  createdAt: z.any().optional(), // Firestore Timestamp
  updatedAt: z.any().optional(), // Firestore Timestamp
})

export type CompanyDoc = z.infer<typeof CompanyDocSchema>
export type CompanySize = z.infer<typeof CompanySizeSchema>
export type CompanyStatus = z.infer<typeof CompanyStatusSchema>
