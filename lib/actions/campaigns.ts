// lib/actions/campaigns.ts
"use server"

import { z } from "zod"
import { createCampaign } from "@/lib/data/campaigns" // tu función real DB

const createCampaignSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  empresaId: z.string().min(1, "Empresa requerida"),
  // ...otros campos
})

export type CreateCampaignState =
  | { ok: true; campaignId: string }
  | { ok: false; fieldErrors: Record<string, string>; formError?: string }

export async function createCampaignAction(
  _prev: CreateCampaignState | null,
  formData: FormData
): Promise<CreateCampaignState> {
  const raw = {
    nombre: String(formData.get("nombre") ?? ""),
    empresaId: String(formData.get("empresaId") ?? ""),
    // ...
  }

  const parsed = createCampaignSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form"
      fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  try {
    const created = await createCampaignInDb(parsed.data)
    return { ok: true, campaignId: created.id }
  } catch (e) {
    // aquí NO tires el error tal cual al cliente
    return { ok: false, fieldErrors: {}, formError: "No se pudo crear la campaña" }
  }
}
