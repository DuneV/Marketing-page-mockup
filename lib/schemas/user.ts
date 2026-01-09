// lib/schemas/user.ts
import { z } from "zod"

export const RoleSchema = z.enum(["admin", "company", "employee"])

export const UserDocSchema = z.object({
  username: z.string().min(3),
  nombre: z.string().min(1),
  cedula: z.string().min(5),
  correo: z.string().email(),
  role: RoleSchema,
  empresaActualId: z.string().nullable().optional(),
  empresaActualNombre: z.string().nullable().optional(),
  campanaActualId: z.string().nullable().optional(),
  campanaActualNombre: z.string().nullable().optional(),
  unidadesProductos: z.record(z.string(), z.number().int().nonnegative()).default({}),

  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
})

export type UserDoc = z.infer<typeof UserDocSchema>
export type Role = z.infer<typeof RoleSchema>
