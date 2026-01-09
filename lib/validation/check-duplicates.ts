import { getAllUsers } from "@/lib/data/users"
import { getAllCompanies } from "@/lib/data/companies"
import { getAllCampaigns } from "@/lib/data/campaigns"

/**
 * Check if an email is already registered in the system
 * @param email - Email to check
 * @param excludeUserId - Optional user ID to exclude from the check (for edit operations)
 * @returns Promise<boolean> - true if email exists, false otherwise
 */
export async function checkEmailExists(email: string, excludeUserId?: string): Promise<boolean> {
  try {
    const users = await getAllUsers()
    return users.some((u) => u.correo.toLowerCase() === email.toLowerCase() && u.id !== excludeUserId)
  } catch (error) {
    console.error("Error checking email:", error)
    return false
  }
}

/**
 * Check if a username is already registered in the system
 * @param username - Username to check
 * @param excludeUserId - Optional user ID to exclude from the check (for edit operations)
 * @returns Promise<boolean> - true if username exists, false otherwise
 */
export async function checkUsernameExists(username: string, excludeUserId?: string): Promise<boolean> {
  try {
    const users = await getAllUsers()
    return users.some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeUserId)
  } catch (error) {
    console.error("Error checking username:", error)
    return false
  }
}

/**
 * Check if a company name is already registered in the system
 * @param companyName - Company name to check
 * @param excludeCompanyId - Optional company ID to exclude from the check (for edit operations)
 * @returns Promise<boolean> - true if company name exists, false otherwise
 */
export async function checkCompanyNameExists(
  companyName: string,
  excludeCompanyId?: string
): Promise<boolean> {
  try {
    const companies = await getAllCompanies()
    return companies.some(
      (c) => c.nombre.toLowerCase() === companyName.toLowerCase() && c.id !== excludeCompanyId
    )
  } catch (error) {
    console.error("Error checking company name:", error)
    return false
  }
}

/**
 * Check if a campaign name already exists for a specific company
 * @param campaignName - Campaign name to check
 * @param empresaId - Company ID to check within
 * @param excludeCampaignId - Optional campaign ID to exclude from the check (for edit operations)
 * @returns Promise<boolean> - true if campaign name exists for this company, false otherwise
 */
export async function checkCampaignNameExists(
  campaignName: string,
  empresaId: string,
  excludeCampaignId?: string
): Promise<boolean> {
  try {
    const campaigns = await getAllCampaigns()
    return campaigns.some(
      (c) =>
        c.nombre.toLowerCase() === campaignName.toLowerCase() &&
        c.empresaId === empresaId &&
        c.id !== excludeCampaignId
    )
  } catch (error) {
    console.error("Error checking campaign name:", error)
    return false
  }
}

/**
 * Generate username suggestion from full name
 * @param nombre - Full name
 * @returns string - Suggested username (e.g., "Juan Pérez" → "juan.perez")
 */
export function generateUsernameSuggestion(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, ".") // Replace spaces with dots
    .replace(/[^a-z0-9.]/g, "") // Remove special characters
}

/**
 * Generate campaign name suggestion from company name and year
 * @param empresaNombre - Company name
 * @returns string - Suggested campaign name (e.g., "Campaña TechCorp 2025")
 */
export function generateCampaignNameSuggestion(empresaNombre: string): string {
  const year = new Date().getFullYear()
  return `Campaña ${empresaNombre} ${year}`
}
