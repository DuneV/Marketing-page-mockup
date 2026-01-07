// lib/auth/logout.ts
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { clearUserCache } from "./useAuthRole"

export async function logout() {
  try {
    // Limpiar cache antes de cerrar sesión
    clearUserCache()
    
    // Cerrar sesión en Firebase
    await signOut(auth)
    
    console.log("[logout] Sesión cerrada exitosamente")
    
    // Opcional: limpiar localStorage/sessionStorage
    if (typeof window !== "undefined") {
      localStorage.clear()
      sessionStorage.clear()
    }
    
    return { success: true }
  } catch (error) {
    console.error("[logout] Error al cerrar sesión:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Hook para usar en componentes
export function useLogout() {
  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      // Redirigir al login
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login"
      }
    }
    return result
  }

  return { logout: handleLogout }
}