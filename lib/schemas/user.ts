// son los esquemas de la base de datos de firestore

import { z } from "zod"

export const UserDocSchema = z.object({
  username: z.string().min(3),
  nombre: z.string().min(1),
  cedula: z.string().min(5), 
  correo: z.string().email(),
  empresaActualId: z.string().nullable().optional(),
  campanaActualId: z.string().nullable().optional(),
  unidadesProductos: z.record(z.number().int().nonnegative()).default({}),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
})

export type UserDoc = z.infer<typeof UserDocSchema>
