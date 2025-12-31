import type { Role } from "@/lib/schemas/user"

/**
 * Verificar si un usuario puede ver campañas
 */
export function canViewCampaigns(role: Role): boolean {
  return role === "admin" || role === "employee"
}

/**
 * Verificar si un usuario puede crear campañas
 */
export function canCreateCampaign(role: Role): boolean {
  return role === "admin"
}

/**
 * Verificar si un usuario puede editar campañas
 */
export function canEditCampaign(role: Role): boolean {
  return role === "admin"
}

/**
 * Verificar si un usuario puede eliminar campañas
 */
export function canDeleteCampaign(role: Role): boolean {
  return role === "admin"
}

/**
 * Verificar si un usuario puede subir imágenes a una campaña
 */
export function canUploadImages(
  role: Role,
  campaignUserId: string,
  currentUserId: string
): boolean {
  if (role === "admin") return true
  if (role === "employee" && campaignUserId === currentUserId) return true
  return false
}

/**
 * Verificar si un usuario puede comentar en una campaña
 */
export function canComment(
  role: Role,
  campaignUserId: string,
  currentUserId: string
): boolean {
  if (role === "admin") return true
  if (role === "employee" && campaignUserId === currentUserId) return true
  return false
}

/**
 * Verificar si un usuario puede eliminar imágenes de una campaña
 */
export function canDeleteImages(role: Role): boolean {
  return role === "admin"
}

/**
 * Verificar si un usuario puede asignar usuarios a campañas
 */
export function canAssignUsers(role: Role): boolean {
  return role === "admin"
}
