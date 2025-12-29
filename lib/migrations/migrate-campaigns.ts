import { getAllCampaigns, updateCampaign } from "@/lib/data/campaigns"
import { getUser } from "@/lib/data/users"
import { getCompany } from "@/lib/data/companies"

/**
 * Migración one-time para agregar campos denormalizados a campañas existentes
 *
 * Este script actualiza todas las campañas que no tienen los campos
 * usuarioResponsableNombre y empresaNombre con los valores correctos
 * obtenidos de las colecciones users y companies.
 */
export async function migrateCampaigns() {
  console.log("Iniciando migración de campañas...")

  try {
    const campaigns = await getAllCampaigns()
    console.log(`Encontradas ${campaigns.length} campañas`)

    let migrated = 0
    let skipped = 0
    const errors: Array<{ id: string; error: string }> = []

    for (const campaign of campaigns) {
      try {
        // Verificar si ya tiene los campos denormalizados
        if (campaign.usuarioResponsableNombre && campaign.empresaNombre) {
          console.log(`Campaña ${campaign.id} ya tiene campos denormalizados, omitiendo...`)
          skipped++
          continue
        }

        console.log(`Migrando campaña ${campaign.id} (${campaign.nombre})...`)

        // Obtener usuario y empresa en paralelo
        const [user, company] = await Promise.all([
          getUser(campaign.usuarioResponsableId),
          getCompany(campaign.empresaId)
        ])

        // Actualizar campaña con nombres denormalizados
        await updateCampaign(campaign.id, {
          usuarioResponsableNombre: user?.nombre || "Usuario desconocido",
          empresaNombre: company?.nombre || "Empresa desconocida"
        })

        migrated++
        console.log(`✓ Campaña ${campaign.id} migrada exitosamente`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido"
        console.error(`✗ Error migrando campaña ${campaign.id}:`, errorMessage)
        errors.push({
          id: campaign.id,
          error: errorMessage
        })
      }
    }

    const result = {
      total: campaigns.length,
      migrated,
      skipped,
      errors: errors.length,
      errorDetails: errors
    }

    console.log("\n=== Resultado de la migración ===")
    console.log(`Total de campañas: ${result.total}`)
    console.log(`Migradas: ${result.migrated}`)
    console.log(`Omitidas (ya tenían datos): ${result.skipped}`)
    console.log(`Errores: ${result.errors}`)

    if (errors.length > 0) {
      console.log("\nDetalles de errores:")
      errors.forEach(({ id, error }) => {
        console.log(`  - Campaña ${id}: ${error}`)
      })
    }

    return result
  } catch (error) {
    console.error("Error general en la migración:", error)
    throw error
  }
}
