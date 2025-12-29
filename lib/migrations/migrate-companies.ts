/**
 * Script de migración para mover empresas de localStorage a Firestore
 *
 * Este script debe ejecutarse una sola vez para migrar los datos existentes.
 * Puede ser llamado desde un componente admin o ejecutado manualmente.
 */

import { CompaniesStorage } from "@/lib/companies-storage"
import { createCompany, getAllCompanies } from "@/lib/data/companies"
import type { Company } from "@/types/company"

export interface MigrationResult {
  success: boolean
  migrated: number
  skipped: number
  errors: string[]
  details: {
    localStorageCount: number
    firestoreCount: number
  }
}

/**
 * Migrar empresas de localStorage a Firestore
 */
export async function migrateCompaniesToFirestore(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: 0,
    skipped: 0,
    errors: [],
    details: {
      localStorageCount: 0,
      firestoreCount: 0,
    },
  }

  try {
    // 1. Obtener empresas de localStorage
    CompaniesStorage.initialize()
    const localCompanies = CompaniesStorage.getAll()
    result.details.localStorageCount = localCompanies.length

    console.log(`[Migration] Encontradas ${localCompanies.length} empresas en localStorage`)

    if (localCompanies.length === 0) {
      result.success = true
      console.log("[Migration] No hay empresas para migrar")
      return result
    }

    // 2. Verificar si ya existen empresas en Firestore
    const existingCompanies = await getAllCompanies()
    result.details.firestoreCount = existingCompanies.length

    if (existingCompanies.length > 0) {
      console.warn(
        `[Migration] Ya existen ${existingCompanies.length} empresas en Firestore. Saltando migración.`
      )
      result.skipped = localCompanies.length
      result.success = true
      return result
    }

    // 3. Migrar cada empresa
    for (const company of localCompanies) {
      try {
        const companyData: Omit<Company, "id" | "fechaCreacion"> = {
          nombre: company.nombre,
          tamaño: company.tamaño,
          tipo: company.tipo,
          productos: company.productos,
          cantidad: company.cantidad,
          username: company.username,
          contraseña: company.contraseña,
          estado: company.estado,
          totalCampañas: company.totalCampañas || 0,
          inversionTotal: company.inversionTotal || 0,
        }

        await createCompany(companyData)
        result.migrated++

        console.log(`[Migration] Migrada empresa: ${company.nombre}`)
      } catch (error) {
        const errorMsg = `Error migrando ${company.nombre}: ${error}`
        result.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    // 4. Verificar resultado
    const finalCount = await getAllCompanies()
    result.details.firestoreCount = finalCount.length

    result.success = result.errors.length === 0
    console.log(
      `[Migration] Completada. Migradas: ${result.migrated}, Errores: ${result.errors.length}`
    )

    return result
  } catch (error) {
    result.errors.push(`Error general en migración: ${error}`)
    console.error("[Migration] Error:", error)
    return result
  }
}

/**
 * Hacer backup de empresas de localStorage
 */
export function backupLocalStorageCompanies(): Company[] {
  CompaniesStorage.initialize()
  const companies = CompaniesStorage.getAll()

  // Guardar en una key separada como backup
  localStorage.setItem("companies_backup", JSON.stringify(companies))
  console.log(`[Backup] Guardadas ${companies.length} empresas en companies_backup`)

  return companies
}

/**
 * Restaurar empresas desde backup
 */
export function restoreFromBackup(): Company[] | null {
  const backup = localStorage.getItem("companies_backup")
  if (!backup) {
    console.warn("[Backup] No se encontró backup")
    return null
  }

  try {
    const companies = JSON.parse(backup) as Company[]
    localStorage.setItem("companies", JSON.stringify(companies))
    console.log(`[Backup] Restauradas ${companies.length} empresas desde backup`)
    return companies
  } catch (error) {
    console.error("[Backup] Error restaurando:", error)
    return null
  }
}
