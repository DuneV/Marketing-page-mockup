"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { assignUserToCampaign } from "@/lib/data/users"
import { updateCampaign } from "@/lib/data/campaigns"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Campaign } from "@/types/campaign"

interface AssignUserToCampaignModalProps {
  campaign: Campaign | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface User {
  uid: string
  nombre: string
  role: string
}

export function AssignUserToCampaignModal({ campaign, isOpen, onClose, onSuccess }: AssignUserToCampaignModalProps) {
  const [employees, setEmployees] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [unassignCurrent, setUnassignCurrent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
      setSelectedUserId("")
      setUnassignCurrent(false)
    }
  }, [isOpen])

  const loadEmployees = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "employee"))
      const snapshot = await getDocs(q)
      const employeesList = snapshot.docs.map((doc) => ({
        uid: doc.id,
        nombre: doc.data().nombre,
        role: doc.data().role,
      }))
      setEmployees(employeesList)
    } catch (error) {
      console.error("Error cargando empleados:", error)
      toast.error("Error al cargar empleados")
    }
  }

  const handleSubmit = async () => {
    if (!campaign) return

    // Validar que se seleccionó un usuario o se marcó desasignar
    if (!selectedUserId && !unassignCurrent) {
      toast.error("Selecciona un usuario o marca la opción de desasignar")
      return
    }

    setIsLoading(true)
    try {
      if (unassignCurrent) {
        // Desasignar usuario actual
        await assignUserToCampaign(campaign.usuarioResponsableId, null)
        toast.success("Usuario desasignado", {
          description: "El usuario ha sido desasignado de la campaña",
        })
      } else {
        // Desasignar usuario anterior (si existe)
        if (campaign.usuarioResponsableId) {
          await assignUserToCampaign(campaign.usuarioResponsableId, null)
        }

        // Asignar nuevo usuario
        await assignUserToCampaign(selectedUserId, campaign.id)

        // Actualizar campaña con nuevo usuario responsable
        await updateCampaign(campaign.id, {
          usuarioResponsableId: selectedUserId,
        })

        const newUser = employees.find((e) => e.uid === selectedUserId)
        toast.success("Usuario asignado", {
          description: `${newUser?.nombre} ha sido asignado a la campaña`,
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error asignando usuario:", error)
      toast.error("Error al asignar usuario")
    } finally {
      setIsLoading(false)
    }
  }

  if (!campaign) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Usuario a Campaña</DialogTitle>
          <DialogDescription>
            Asigna un usuario responsable a <strong>{campaign.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usuario actual */}
          {campaign.usuarioResponsableNombre && (
            <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Usuario Actual
              </p>
              <p className="text-base font-semibold">{campaign.usuarioResponsableNombre}</p>
            </div>
          )}

          {/* Selector de nuevo usuario */}
          <div className="space-y-2">
            <Label htmlFor="user-select">Nuevo Usuario Responsable</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={unassignCurrent}
            >
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.uid} value={employee.uid}>
                    {employee.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opción de desasignar */}
          {campaign.usuarioResponsableId && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="unassign"
                checked={unassignCurrent}
                onCheckedChange={(checked) => {
                  setUnassignCurrent(checked as boolean)
                  if (checked) {
                    setSelectedUserId("")
                  }
                }}
              />
              <label
                htmlFor="unassign"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Desasignar usuario actual
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-amber-600 hover:bg-amber-700"
            disabled={isLoading || (!selectedUserId && !unassignCurrent)}
          >
            {isLoading ? "Asignando..." : unassignCurrent ? "Desasignar" : "Asignar Usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
