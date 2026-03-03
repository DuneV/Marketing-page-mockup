// services/import-api/src/middleware/requireRoles.ts

import { Request, Response, NextFunction } from "express"
import { requireAuth } from "./requireAuth.js"

export type AllowedRole = "admin" | "company" | "user"

/**
 * Middleware que valida que el usuario tenga uno de los roles permitidos
 * @param allowedRoles - Array de roles permitidos
 * @returns Express middleware
 */
export function requireRoles(...allowedRoles: AllowedRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1) Primero valida auth (token válido)
      const auth = await requireAuth(req)
      
      // 2) Guarda auth en req para usarlo después
      ;(req as any).auth = auth
      
      // 3) Valida que el rol esté en la lista permitida
      if (!allowedRoles.includes(auth.role as AllowedRole)) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: `Acceso denegado. Roles permitidos: ${allowedRoles.join(", ")}`,
          yourRole: auth.role
        })
      }
      
      next()
    } catch (error: any) {
      return res.status(error?.status ?? 401).json({
        error: error?.message ?? "Unauthorized"
      })
    }
  }
}

/**
 * Helper: Requiere solo admin
 */
export const requireAdminRole = requireRoles("admin")

/**
 * Helper: Requiere admin o company
 */
export const requireAdminOrCompany = requireRoles("admin", "company")

/**
 * Helper: Requiere cualquier rol autenticado
 */
export const requireAnyRole = requireRoles("admin", "company", "user")