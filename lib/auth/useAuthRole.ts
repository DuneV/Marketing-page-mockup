// lib/auth/useAuthRole.ts
"use client"

import { useEffect, useState, useRef } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/client"

export type Role = "admin" | "company" | "employee" | null

// Extender User con datos adicionales de Firestore
export interface ExtendedUser extends FirebaseUser {
  nombre?: string
  companyId?: string
  role?: Role
}

interface AuthRoleState {
  user: ExtendedUser | null
  role: Role
  loading: boolean
  error: Error | null
}

// Cache global para evitar llamadas duplicadas
interface CachedUserData {
  role: Role
  nombre?: string
  companyId?: string
  timestamp: number
}

const userCache = new Map<string, CachedUserData>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export function useAuthRole() {
  const [state, setState] = useState<AuthRoleState>({
    user: null,
    role: null,
    loading: true,
    error: null,
  })

  // Prevenir múltiples llamadas simultáneas
  const isFetchingRef = useRef(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Usuario no autenticado
      if (!firebaseUser) {
        console.log("[useAuthRole] Usuario no autenticado")
        setState({ user: null, role: null, loading: false, error: null })
        return
      }

      // Prevenir llamadas duplicadas
      if (isFetchingRef.current) {
        console.log("[useAuthRole] Ya hay una llamada en progreso, omitiendo...")
        return
      }

      try {
        isFetchingRef.current = true

        // Verificar cache
        const cached = userCache.get(firebaseUser.uid)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log("[useAuthRole] Usando datos cacheados")
          const extendedUser: ExtendedUser = {
            ...firebaseUser,
            role: cached.role,
            nombre: cached.nombre,
            companyId: cached.companyId,
          }
          setState({ user: extendedUser, role: cached.role, loading: false, error: null })
          return
        }

        console.log("[useAuthRole] Obteniendo datos desde Firestore para uid:", firebaseUser.uid)

        // Esperar un momento para asegurar sincronización
        await new Promise((resolve) => setTimeout(resolve, 100))

        const snap = await getDoc(doc(db, "users", firebaseUser.uid))

        if (!snap.exists()) {
          console.warn("[useAuthRole] Documento de usuario no existe:", firebaseUser.uid)
          setState({
            user: firebaseUser as ExtendedUser,
            role: null,
            loading: false,
            error: new Error("User document not found"),
          })
          return
        }

        const data = snap.data()
        const role = data.role as Role
        const nombre = data.nombre || data.name || firebaseUser.displayName || ""
        const companyId = data.companyId || data.empresaId || undefined

        console.log("[useAuthRole] Datos obtenidos:", { role, nombre, companyId })

        // Guardar en cache
        userCache.set(firebaseUser.uid, {
          role,
          nombre,
          companyId,
          timestamp: Date.now(),
        })

        // Crear usuario extendido
        const extendedUser: ExtendedUser = {
          ...firebaseUser,
          role,
          nombre,
          companyId,
        }

        setState({
          user: extendedUser,
          role: role ?? null,
          loading: false,
          error: null,
        })
      } catch (err) {
        console.error("[useAuthRole] Error obteniendo datos:", err)

        // Logging detallado del error
        if (err instanceof Error) {
          console.error("Error name:", err.name)
          console.error("Error message:", err.message)
          console.error("Error stack:", err.stack)
        }

        setState({
          user: firebaseUser as ExtendedUser,
          role: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        })
      } finally {
        isFetchingRef.current = false
      }
    })

    return () => unsub()
  }, [])

  return state
}

// Función auxiliar para limpiar cache (útil en logout)
export function clearUserCache() {
  userCache.clear()
  console.log("[useAuthRole] Cache limpiado")
}