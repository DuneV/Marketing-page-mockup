import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  addDoc,
  writeBatch,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase/client"
import { CampaignDocSchema, CampaignImageSchema, CampaignCommentSchema } from "@/lib/schemas/campaign"
import type { CampaignDoc, CampaignImage, CampaignComment } from "@/lib/schemas/campaign"

/**
 * Crear una nueva campaña en Firestore
 */
export async function createCampaign(uid: string, data: Omit<CampaignDoc, "createdAt" | "updatedAt" | "createdBy">): Promise<string> {
  const campaignData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
  }

  const parsed = CampaignDocSchema.parse(campaignData)
  const docRef = doc(collection(db, "campaigns"))
  await setDoc(docRef, parsed)

  return docRef.id
}

/**
 * Obtener una campaña por ID
 */
export async function getCampaign(campaignId: string): Promise<(CampaignDoc & { id: string }) | null> {
  const snap = await getDoc(doc(db, "campaigns", campaignId))
  if (!snap.exists()) return null

  return {
    id: snap.id,
    ...CampaignDocSchema.parse(snap.data()),
  } as CampaignDoc & { id: string }
}

/**
 * Actualizar una campaña existente
 */
export async function updateCampaign(campaignId: string, data: Partial<CampaignDoc>): Promise<void> {
  await updateDoc(doc(db, "campaigns", campaignId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Eliminar una campaña y sus subcollections
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const batch = writeBatch(db)

  // Delete main campaign document
  batch.delete(doc(db, "campaigns", campaignId))

  // Note: Subcollections (images, comments) need to be deleted separately
  // This is a limitation of Firestore - subcollections are not auto-deleted
  // In production, consider using a Cloud Function for this

  await batch.commit()
}

/**
 * Obtener todas las campañas
 */
export async function getAllCampaigns(): Promise<Array<CampaignDoc & { id: string }>> {
  const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<CampaignDoc & { id: string }>
}

/**
 * Obtener campañas por empresa
 */
export async function getCampaignsByCompany(empresaId: string): Promise<Array<CampaignDoc & { id: string }>> {
  const q = query(
    collection(db, "campaigns"),
    where("empresaId", "==", empresaId),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<CampaignDoc & { id: string }>
}

/**
 * Obtener campañas por usuario responsable
 */
export async function getCampaignsByUser(usuarioId: string): Promise<Array<CampaignDoc & { id: string }>> {
  const q = query(
    collection(db, "campaigns"),
    where("usuarioResponsableId", "==", usuarioId),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<CampaignDoc & { id: string }>
}

/**
 * Obtener campañas por estado
 */
export async function getCampaignsByStatus(status: string): Promise<Array<CampaignDoc & { id: string }>> {
  const q = query(
    collection(db, "campaigns"),
    where("estado", "==", status),
    orderBy("createdAt", "desc")
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<CampaignDoc & { id: string }>
}

// ==================== IMAGE OPERATIONS ====================

/**
 * Subir imagen de campaña a Firebase Storage y guardar metadata en Firestore
 */
export async function uploadCampaignImage(
  campaignId: string,
  file: File,
  uploadedBy: string,
  uploadedByName: string
): Promise<CampaignImage> {
  // Generate unique filename
  const fileExtension = file.name.split(".").pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`
  const storagePath = `campaigns/${campaignId}/${fileName}`

  // Upload to Firebase Storage
  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)

  // Save metadata to Firestore subcollection
  const imageData: Omit<CampaignImage, "id"> = {
    url,
    storagePath,
    name: file.name,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    uploadedByName,
  }

  const imageDoc = await addDoc(collection(db, `campaigns/${campaignId}/images`), {
    ...imageData,
    uploadedAt: serverTimestamp(),
  })

  return {
    id: imageDoc.id,
    ...imageData,
  }
}

/**
 * Obtener todas las imágenes de una campaña
 */
export async function getCampaignImages(campaignId: string): Promise<CampaignImage[]> {
  const q = query(collection(db, `campaigns/${campaignId}/images`), orderBy("uploadedAt", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      url: data.url,
      storagePath: data.storagePath,
      name: data.name,
      uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt,
      uploadedBy: data.uploadedBy,
      uploadedByName: data.uploadedByName,
    }
  }) as CampaignImage[]
}

/**
 * Eliminar imagen de campaña (Storage + Firestore)
 */
export async function deleteCampaignImage(
  campaignId: string,
  imageId: string,
  storagePath: string
): Promise<void> {
  // Delete from Storage
  const storageRef = ref(storage, storagePath)
  await deleteObject(storageRef)

  // Delete metadata from Firestore
  await deleteDoc(doc(db, `campaigns/${campaignId}/images`, imageId))
}

/**
 * Eliminar todas las imágenes de una campaña (usado al eliminar campaña)
 */
export async function deleteAllCampaignImages(campaignId: string): Promise<void> {
  const images = await getCampaignImages(campaignId)

  const deletePromises = images.map((image) =>
    deleteCampaignImage(campaignId, image.id, image.storagePath)
  )

  await Promise.all(deletePromises)
}

// ==================== COMMENT OPERATIONS ====================

/**
 * Agregar comentario a campaña
 */
export async function addCampaignComment(
  campaignId: string,
  comment: Omit<CampaignComment, "id" | "timestamp">
): Promise<string> {
  const commentData = {
    ...comment,
    timestamp: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, `campaigns/${campaignId}/comments`), commentData)
  return docRef.id
}

/**
 * Obtener todos los comentarios de una campaña
 */
export async function getCampaignComments(campaignId: string): Promise<CampaignComment[]> {
  const q = query(collection(db, `campaigns/${campaignId}/comments`), orderBy("timestamp", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      author: data.author,
      authorName: data.authorName,
      authorRole: data.authorRole,
      text: data.text,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
    }
  }) as CampaignComment[]
}

/**
 * Eliminar todos los comentarios de una campaña (usado al eliminar campaña)
 */
export async function deleteAllCampaignComments(campaignId: string): Promise<void> {
  const q = query(collection(db, `campaigns/${campaignId}/comments`))
  const snapshot = await getDocs(q)

  const batch = writeBatch(db)
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()
}
