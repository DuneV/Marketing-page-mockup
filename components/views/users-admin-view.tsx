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
import { TablePagination } from "@/components/admin/table-pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

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

  // Filtrado y ordenamiento de usuarios
  const filteredUsers = useMemo(() => {
    let result = users.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.correo.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === "all" || user.role === roleFilter

      return matchesSearch && matchesRole
    })

    // Aplicar ordenamiento
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aValue = a[sortKey as keyof User]
        let bValue = b[sortKey as keyof User]

        // Manejar valores undefined
        if (aValue === undefined) return 1
        if (bValue === undefined) return -1

        // Comparación
        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
          return sortDirection === "asc" ? comparison : -comparison
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }

        return 0
      })
    }

    return result
  }, [users, searchQuery, roleFilter, sortKey, sortDirection])

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredUsers.slice(startIndex, startIndex + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  // Reset a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter])

  // Manejar ordenamiento
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const totalUsers = users.length
  const totalUnits = users.reduce((sum, u) => {
    const userTotal = Object.values(u.unidadesProductos || {}).reduce((s, qty) => s + qty, 0)
    return sum + userTotal
  }, 0)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <TableSearch
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Buscar por nombre, usuario o correo..."
              filterValue={roleFilter}
              onFilterChange={setRoleFilter}
              filterOptions={roleFilterOptions}
              filterLabel="Rol"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Items por página:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <UsersTable
            users={paginatedUsers}
            onDelete={handleDeleteClick}
            onCreateClick={() => setIsCreateModalOpen(true)}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          {filteredUsers.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
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
