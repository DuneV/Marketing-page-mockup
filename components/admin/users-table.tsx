import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Users } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SortableTableHead } from "@/components/admin/sortable-table-head"
import type { User } from "@/types/user"
import { EmptyState } from "./empty-state"

interface UsersTableProps {
  users: User[]
  onDelete: (userId: string) => void
  onCreateClick?: () => void
  sortKey: string | null
  sortDirection: "asc" | "desc"
  onSort: (key: string) => void
}

const roleLabels = {
  admin: "Admin",
  employee: "Empleado",
  company: "Empresa",
}

const roleColors = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  employee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  company: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
}

export function UsersTable({ users, onDelete, onCreateClick, sortKey, sortDirection, onSort }: UsersTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              label="Usuario"
              sortKey="username"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[12%]"
            />
            <SortableTableHead
              label="Nombre"
              sortKey="nombre"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="w-[60%] md:w-[18%]"
            />
            <SortableTableHead
              label="Rol"
              sortKey="role"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[10%]"
            />
            <TableHead className="hidden md:table-cell md:w-[12%]">Cédula</TableHead>
            <TableHead className="hidden md:table-cell md:w-[18%]">Empresa Asignada</TableHead>
            <TableHead className="hidden md:table-cell md:w-[10%] text-center">Unidades</TableHead>
            <SortableTableHead
              label="Creación"
              sortKey="createdAt"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[12%]"
            />
            <TableHead className="w-[40%] md:w-[8%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-[400px] p-0">
                <EmptyState
                  icon={Users}
                  title="No hay usuarios registrados"
                  description="Agrega usuarios internos para gestionar las campañas y dar acceso al sistema"
                  actionLabel={onCreateClick ? "Nuevo Usuario" : undefined}
                  onAction={onCreateClick}
                />
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <TableCell className="hidden md:table-cell font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[100px]">{user.username}</div>
                    </TooltipTrigger>
                    <TooltipContent>{user.username}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[160px] md:max-w-[150px]">{user.nombre}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>
                        <p className="font-semibold">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground">{user.correo}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className={roleColors[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-sm">{user.cedula}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[140px]">
                        {user.empresaActualNombre || <span className="text-muted-foreground">Sin asignar</span>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{user.empresaActualNombre || "Sin empresa asignada"}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden md:table-cell text-center font-medium">
                  {Object.values(user.unidadesProductos || {})
                    .reduce((sum, qty) => sum + qty, 0)
                    .toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar usuario</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
