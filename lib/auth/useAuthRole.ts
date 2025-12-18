"use client"

import { useEffect, useState, useRef } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/client"

export type Role = "admin" | "company" | "employee" | null

interface AuthRoleState {
  user: User | null
  role: Role
  loading: boolean
  error: Error | null
}

// Cache global para evitar llamadas duplicadas
const roleCache = new Map<string, { role: Role; timestamp: number }>()
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
    const unsub = onAuthStateChanged(auth, async (u) => {
      // Usuario no autenticado
      if (!u) {
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
        const cached = roleCache.get(u.uid)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log("[useAuthRole] Usando rol cacheado:", cached.role)
          setState({ user: u, role: cached.role, loading: false, error: null })
          return
        }

        console.log("[useAuthRole] Obteniendo rol desde Firestore para uid:", u.uid)

        // Esperar un momento para asegurar que el token esté sincronizado
        await new Promise((resolve) => setTimeout(resolve, 100))

        const snap = await getDoc(doc(db, "users", u.uid))

        if (!snap.exists()) {
          console.warn("[useAuthRole] Documento de usuario no existe:", u.uid)
          setState({
            user: u,
            role: null,
            loading: false,
            error: new Error("User document not found"),
          })
          return
        }

        const data = snap.data()
        const r = data.role as Role

        console.log("[useAuthRole] Rol obtenido:", r)

        // Guardar en cache
        roleCache.set(u.uid, { role: r, timestamp: Date.now() })

        setState({ user: u, role: r ?? null, loading: false, error: null })
      } catch (err) {
        console.error("[useAuthRole] Error obteniendo rol:", err)

        // Logging detallado del error
        if (err instanceof Error) {
          console.error("Error name:", err.name)
          console.error("Error message:", err.message)
          console.error("Error stack:", err.stack)
        }

        setState({
          user: u,
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
export function clearRoleCache() {
  roleCache.clear()
  console.log("[useAuthRole] Cache limpiado")
}
