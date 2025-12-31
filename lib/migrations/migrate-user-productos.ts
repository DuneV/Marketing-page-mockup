import { collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase/client"

/**
 * Migración de usuarios: Convertir unidadesProductos de number a Record<string, number>
 *
 * IMPORTANTE: Esta migración convierte los valores numéricos antiguos a objetos vacíos,
 * ya que no tenemos forma de saber qué productos específicos correspondían a esos números.
 * El valor antiguo se preserva en el campo unidadesProductosLegacy para referencia.
 */
export async function migrateUserProductos() {
  const usersRef = collection(db, "users")
  const snapshot = await getDocs(usersRef)

  let migrated = 0
  let skipped = 0
  let errors = 0

  console.log(`Iniciando migración de ${snapshot.docs.length} usuarios...`)

  for (const userDoc of snapshot.docs) {
    try {
      const data = userDoc.data()

      // Si unidadesProductos es un número (formato viejo)
      if (typeof data.unidadesProductos === "number") {
        console.log(
          `Migrando usuario ${userDoc.id}: ${data.unidadesProductos} unidades → objeto vacío`
        )

        await updateDoc(doc(db, "users", userDoc.id), {
          unidadesProductos: {},
          // Guardar el valor antiguo para referencia
          unidadesProductosLegacy: data.unidadesProductos,
        })

        migrated++
      } else if (typeof data.unidadesProductos === "object") {
        // Ya está en el formato correcto
        console.log(`Usuario ${userDoc.id} ya tiene formato correcto, saltando...`)
        skipped++
      } else {
        // Formato desconocido
        console.warn(
          `Usuario ${userDoc.id} tiene formato desconocido: ${typeof data.unidadesProductos}`
        )

        // Convertir a objeto vacío de todas formas
        await updateDoc(doc(db, "users", userDoc.id), {
          unidadesProductos: {},
          unidadesProductosLegacy: data.unidadesProductos,
        })

        migrated++
      }
    } catch (error) {
      console.error(`Error migrando usuario ${userDoc.id}:`, error)
      errors++
    }
  }

  const result = {
    total: snapshot.docs.length,
    migrated,
    skipped,
    errors,
  }

  console.log("\n=== Resultado de la Migración ===")
  console.log(`Total de usuarios: ${result.total}`)
  console.log(`Migrados exitosamente: ${result.migrated}`)
  console.log(`Saltados (ya migrados): ${result.skipped}`)
  console.log(`Errores: ${result.errors}`)

  return result
}

/**
 * Verificar cuántos usuarios necesitan migración sin ejecutarla
 */
export async function checkMigrationStatus() {
  const usersRef = collection(db, "users")
  const snapshot = await getDocs(usersRef)

  let needsMigration = 0
  let alreadyMigrated = 0
  let unknown = 0

  for (const userDoc of snapshot.docs) {
    const data = userDoc.data()

    if (typeof data.unidadesProductos === "number") {
      needsMigration++
    } else if (typeof data.unidadesProductos === "object") {
      alreadyMigrated++
    } else {
      unknown++
    }
  }

  const status = {
    total: snapshot.docs.length,
    needsMigration,
    alreadyMigrated,
    unknown,
  }

  console.log("\n=== Estado de Migración ===")
  console.log(`Total de usuarios: ${status.total}`)
  console.log(`Necesitan migración: ${status.needsMigration}`)
  console.log(`Ya migrados: ${status.alreadyMigrated}`)
  console.log(`Formato desconocido: ${status.unknown}`)

  return status
}
