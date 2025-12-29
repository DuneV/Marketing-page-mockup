// lib/data/users.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { UserDocSchema, type UserDoc } from "@/lib/schemas/user"
import type { User, UserFormData } from "@/types/user"

// Helper para convertir Timestamp de Firestore a string ISO
function timestampToString(timestamp: Timestamp | string | undefined): string {
  if (!timestamp) return new Date().toISOString()
  if (typeof timestamp === "string") return timestamp
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString()
  return new Date().toISOString()
}

export async function upsertUser(uid: string, data: UserDoc) {
  const parsed = UserDocSchema.parse(data)

  await setDoc(
    doc(db, "users", uid),
    { ...parsed, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
    { merge: true }
  )
}

export async function getUser(uid: string) {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  return UserDocSchema.parse(snap.data())
}

/**
 * Obtener todos los usuarios (para vista de admin)
 */
export async function getAllUsers(): Promise<User[]> {
  const usersRef = collection(db, "users")
  const q = query(usersRef, orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      username: data.username || "",
      nombre: data.nombre || "",
      cedula: data.cedula || "",
      correo: data.correo || "",
      role: data.role || "employee",
      empresaActualId: data.empresaActualId || null,
      empresaActualNombre: data.empresaActualNombre || null,
      campanaActualId: data.campanaActualId || null,
      campanaActualNombre: data.campanaActualNombre || null,
      unidadesProductos: data.unidadesProductos || 0,
      createdAt: timestampToString(data.createdAt),
      updatedAt: timestampToString(data.updatedAt),
    }
  })
}

/**
 * Obtener usuarios por rol
 */
export async function getUsersByRole(role: "admin" | "company" | "employee"): Promise<User[]> {
  const allUsers = await getAllUsers()
  return allUsers.filter((user) => user.role === role)
}

/**
 * Crear un nuevo usuario (para admin)
 */
export async function createUser(data: UserFormData): Promise<string> {
  const usersRef = collection(db, "users")
  const newDocRef = doc(usersRef)

  await setDoc(newDocRef, {
    username: data.username,
    nombre: data.nombre,
    cedula: data.cedula,
    correo: data.correo,
    role: data.role,
    empresaActualId: data.empresaActualId || null,
    empresaActualNombre: data.empresaActualNombre || null,
    campanaActualId: null,
    campanaActualNombre: null,
    unidadesProductos: data.unidadesProductos || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return newDocRef.id
}

/**
 * Actualizar un usuario existente
 */
export async function updateUser(uid: string, data: Partial<UserFormData>): Promise<void> {
  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Eliminar un usuario
 */
export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid))
}

/**
 * Asignar o desasignar una campaña a un usuario
 * @param uid - ID del usuario
 * @param campaignId - ID de la campaña (null para desasignar)
 * @param campaignName - Nombre de la campaña (opcional, para denormalización)
 */
export async function assignUserToCampaign(
  uid: string,
  campaignId: string | null,
  campaignName?: string | null
) {
  await updateDoc(doc(db, "users", uid), {
    campanaActualId: campaignId,
    campanaActualNombre: campaignName || null,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Asignar empresa a un usuario
 */
export async function assignUserToCompany(
  uid: string,
  companyId: string | null,
  companyName?: string | null
) {
  await updateDoc(doc(db, "users", uid), {
    empresaActualId: companyId,
    empresaActualNombre: companyName || null,
    updatedAt: serverTimestamp(),
  })
}
