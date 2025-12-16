import { z } from "zod"

export const CompanyDocSchema = z.object({
  nombre: z.string().min(1),
  tamano: z.enum(["pequena", "mediana", "grande"]).optional(),
  tipo: z.string().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
})

export type CompanyDoc = z.infer<typeof CompanyDocSchema>
