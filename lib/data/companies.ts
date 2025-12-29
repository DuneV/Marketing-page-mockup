import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { CompanyDocSchema } from "@/lib/schemas/company"
import type { CompanyDoc } from "@/lib/schemas/company"
import type { Company } from "@/types/company"

/**
 * Convertir timestamp de Firestore a ISO string
 */
function timestampToISO(timestamp: any): string {
  if (!timestamp) return new Date().toISOString()
  if (typeof timestamp === "string") return timestamp
  if (timestamp.toDate) return timestamp.toDate().toISOString()
  return new Date().toISOString()
}

/**
 * Crear una nueva empresa en Firestore
 */
export async function createCompany(data: Omit<Company, "id" | "fechaCreacion">): Promise<string> {
  const companyData = {
    ...data,
    fechaCreacion: new Date().toISOString(),
    totalCampañas: data.totalCampañas || 0,
    inversionTotal: data.inversionTotal || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const parsed = CompanyDocSchema.parse(companyData)
  const docRef = doc(collection(db, "companies"))
  await setDoc(docRef, parsed)

  return docRef.id
}

/**
 * Obtener una empresa por ID (sin contraseña por seguridad)
 */
export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, "companies", companyId))
  if (!snap.exists()) return null

  const data = snap.data()
  return {
    id: snap.id,
    nombre: data.nombre,
    tamaño: data.tamaño,
    tipo: data.tipo,
    productos: data.productos || [],
    cantidad: data.cantidad,
    username: data.username,
    contraseña: "••••••••", // Ocultar contraseña por seguridad
    estado: data.estado,
    fechaCreacion: data.fechaCreacion || timestampToISO(data.createdAt),
    totalCampañas: data.totalCampañas || 0,
    inversionTotal: data.inversionTotal || 0,
  }
}

/**
 * Obtener todas las empresas (sin contraseñas por seguridad)
 */
export async function getAllCompanies(): Promise<Company[]> {
  const q = query(collection(db, "companies"), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      nombre: data.nombre,
      tamaño: data.tamaño,
      tipo: data.tipo,
      productos: data.productos || [],
      cantidad: data.cantidad,
      username: data.username,
      contraseña: "••••••••", // Ocultar contraseña por seguridad
      estado: data.estado,
      fechaCreacion: data.fechaCreacion || timestampToISO(data.createdAt),
      totalCampañas: data.totalCampañas || 0,
      inversionTotal: data.inversionTotal || 0,
    }
  })
}

/**
 * Resultado paginado de empresas
 */
export interface PaginatedCompaniesResult {
  companies: Company[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
  total: number
}

/**
 * Obtener empresas con paginación
 */
export async function getCompaniesPaginated(
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null
): Promise<PaginatedCompaniesResult> {
  const companiesRef = collection(db, "companies")

  // Get total count
  const countSnapshot = await getCountFromServer(companiesRef)
  const total = countSnapshot.data().count

  // Build query with pagination
  let q = query(companiesRef, orderBy("createdAt", "desc"), limit(pageSize))

  if (lastDoc) {
    q = query(companiesRef, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize))
  }

  const snapshot = await getDocs(q)

  const companies = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      nombre: data.nombre,
      tamaño: data.tamaño,
      tipo: data.tipo,
      productos: data.productos || [],
      cantidad: data.cantidad,
      username: data.username,
      contraseña: "••••••••",
      estado: data.estado,
      fechaCreacion: data.fechaCreacion || timestampToISO(data.createdAt),
      totalCampañas: data.totalCampañas || 0,
      inversionTotal: data.inversionTotal || 0,
    }
  })

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
  const hasMore = snapshot.docs.length === pageSize

  return {
    companies,
    lastDoc: lastVisible,
    hasMore,
    total,
  }
}

/**
 * Actualizar una empresa
 */
export async function updateCompany(companyId: string, data: Partial<Company>): Promise<void> {
  const updateData: any = { ...data }
  delete updateData.id
  delete updateData.fechaCreacion

  await updateDoc(doc(db, "companies", companyId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Eliminar una empresa
 */
export async function deleteCompany(companyId: string): Promise<void> {
  await deleteDoc(doc(db, "companies", companyId))
}

/**
 * Actualizar estadísticas de campañas de una empresa
 */
export async function updateCompanyCampaignStats(
  companyId: string,
  totalCampañas: number,
  inversionTotal: number
): Promise<void> {
  await updateDoc(doc(db, "companies", companyId), {
    totalCampañas,
    inversionTotal,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Incrementar contadores de campaña
 */
export async function incrementCompanyCampaignCount(companyId: string, inversionAmount: number): Promise<void> {
  const company = await getCompany(companyId)
  if (!company) return

  await updateCompanyCampaignStats(
    companyId,
    (company.totalCampañas || 0) + 1,
    (company.inversionTotal || 0) + inversionAmount
  )
}

/**
 * Decrementar contadores de campaña
 */
export async function decrementCompanyCampaignCount(companyId: string, inversionAmount: number): Promise<void> {
  const company = await getCompany(companyId)
  if (!company) return

  await updateCompanyCampaignStats(
    companyId,
    Math.max(0, (company.totalCampañas || 0) - 1),
    Math.max(0, (company.inversionTotal || 0) - inversionAmount)
  )
}
