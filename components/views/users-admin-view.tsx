"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plus, UserCheck, Briefcase, Package } from "lucide-react"
import { UsersStorage } from "@/lib/users-storage"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { UsersTable } from "@/components/admin/users-table"
import { CreateUserModal } from "@/components/admin/create-user-modal"
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog"
import { toast } from "sonner"
import type { User } from "@/types/user"

export function UsersAdminView() {
  const [users, setUsers] = useState<User[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    UsersStorage.initialize()
    const loadedUsers = UsersStorage.getAll()
    setUsers(loadedUsers)
    setIsLoading(false)
  }, [])

  const handleCreateUser = (newUser: Omit<User, "id" | "fechaCreacion">) => {
    const created = UsersStorage.create(newUser)
    setUsers([...users, created])
    toast.success("Usuario creado", {
      description: `${newUser.nombre} ha sido agregado exitosamente`
    })
  }

  const handleDeleteUser = () => {
    if (deleteUserId) {
      const userName = users.find(u => u.id === deleteUserId)?.nombre
      UsersStorage.delete(deleteUserId)
      setUsers(users.filter((u) => u.id !== deleteUserId))
      setDeleteUserId(null)
      toast.success("Usuario eliminado", {
        description: `${userName} ha sido eliminado permanentemente`
      })
    }
  }

  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId)
  }

  const totalUsers = users.length
  const totalUnits = users.reduce((sum, u) => sum + u.unidades_productos, 0)
  const uniqueCompanies = new Set(users.map((u) => u.empresa_campaña_actual)).size

  const userToDelete = deleteUserId ? users.find((u) => u.id === deleteUserId) || null : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminKPICard label="Total de Usuarios" value={totalUsers} icon={UserCheck} color="amber" />
        <AdminKPICard label="Empresas Asignadas" value={uniqueCompanies} icon={Briefcase} color="red" />
        <AdminKPICard
          label="Unidades Totales"
          value={totalUnits.toLocaleString()}
          icon={Package}
          color="amber"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Internos</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} onDelete={handleDeleteClick} />
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />

      <DeleteUserDialog
        user={userToDelete}
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
      />
    </div>
  )
}
