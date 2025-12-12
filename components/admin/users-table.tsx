import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { User } from "@/types/user"

interface UsersTableProps {
  users: User[]
  onDelete: (userId: string) => void
}

export function UsersTable({ users, onDelete }: UsersTableProps) {
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
            <TableHead className="w-[15%]">Usuario</TableHead>
            <TableHead className="w-[20%]">Nombre</TableHead>
            <TableHead className="w-[15%]">Cédula</TableHead>
            <TableHead className="w-[20%]">Empresa/Campaña</TableHead>
            <TableHead className="w-[10%] text-center">Unidades</TableHead>
            <TableHead className="w-[12%]">Creación</TableHead>
            <TableHead className="w-[8%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                No hay usuarios registrados
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow
                key={user.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <TableCell className="font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[120px]">{user.username}</div>
                    </TooltipTrigger>
                    <TooltipContent>{user.username}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[180px]">{user.nombre}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div>
                        <p className="font-semibold">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground">{user.correo}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-mono text-sm">{user.cedula}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[150px]">{user.empresa_campaña_actual}</div>
                    </TooltipTrigger>
                    <TooltipContent>{user.empresa_campaña_actual}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {user.unidades_productos.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">{formatDate(user.fechaCreacion)}</TableCell>
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
