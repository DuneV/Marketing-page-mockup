"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Plus, UserCheck, Briefcase, Package, AlertCircle } from "lucide-react"
import { getAllUsers, createUser, deleteUser as deleteUserFromDb } from "@/lib/data/users"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { UsersTable } from "@/components/admin/users-table"
import { CreateUserModal } from "@/components/admin/create-user-modal"
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { KPISkeleton } from "@/components/admin/kpi-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TableSearch, type FilterOption } from "@/components/admin/table-search"
import { toast } from "sonner"
import type { User, UserFormData } from "@/types/user"

const roleFilterOptions: FilterOption[] = [
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Empleado" },
  { value: "company", label: "Empresa" },
]

export function UsersAdminView() {
  const [users, setUsers] = useState<User[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const loadedUsers = await getAllUsers()
      setUsers(loadedUsers)
    } catch (err) {
      console.error("Error loading users:", err)
      setError("Error al cargar los usuarios. Verifica tu conexión.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleCreateUser = async (newUser: UserFormData) => {
    try {
      await createUser(newUser)
      await loadUsers()
      toast.success("Usuario creado", {
        description: `${newUser.nombre} ha sido agregado exitosamente`
      })
    } catch (err) {
      console.error("Error creating user:", err)
      toast.error("Error al crear usuario", {
        description: "No se pudo crear el usuario. Intenta de nuevo."
      })
    }
  }

  const handleDeleteUser = async () => {
    if (deleteUserId) {
      const userName = users.find(u => u.id === deleteUserId)?.nombre
      try {
        await deleteUserFromDb(deleteUserId)
        setUsers(users.filter((u) => u.id !== deleteUserId))
        setDeleteUserId(null)
        toast.success("Usuario eliminado", {
          description: `${userName} ha sido eliminado permanentemente`
        })
      } catch (err) {
        console.error("Error deleting user:", err)
        toast.error("Error al eliminar usuario", {
          description: "No se pudo eliminar el usuario. Intenta de nuevo."
        })
      }
    }
  }

  const handleDeleteClick = (userId: string) => {
    setDeleteUserId(userId)
  }

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.correo.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === "all" || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  const totalUsers = users.length
  const totalUnits = users.reduce((sum, u) => sum + (u.unidadesProductos || 0), 0)
  const uniqueCompanies = new Set(users.filter(u => u.empresaActualNombre).map((u) => u.empresaActualNombre)).size

  const userToDelete = deleteUserId ? users.find((u) => u.id === deleteUserId) || null : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <KPISkeleton key={i} />
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={7} rows={5} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadUsers} variant="outline">
          Reintentar
        </Button>
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
          <CardTitle className="flex items-center justify-between">
            <span>Usuarios Internos</span>
            {filteredUsers.length !== users.length && (
              <span className="text-sm font-normal text-muted-foreground">
                Mostrando {filteredUsers.length} de {users.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSearch
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nombre, usuario o correo..."
            filterValue={roleFilter}
            onFilterChange={setRoleFilter}
            filterOptions={roleFilterOptions}
            filterLabel="Rol"
          />
          <UsersTable users={filteredUsers} onDelete={handleDeleteClick} onCreateClick={() => setIsCreateModalOpen(true)} />
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
