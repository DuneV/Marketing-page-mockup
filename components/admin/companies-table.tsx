// components/admin/companies-table.tsx

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Building2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SortableTableHead } from "@/components/admin/sortable-table-head"
import type { Company } from "@/types/company"
import { EmptyState } from "./empty-state"

interface CompaniesTableProps {
  companies: Company[]
  onDelete: (companyId: string) => void
  onRowClick: (companyId: string) => void
  onCreateClick?: () => void
  sortKey: string | null
  sortDirection: "asc" | "desc"
  onSort: (key: string) => void
}

const sizeColors = {
  pequeño: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  mediano: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  grande: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  enterprise: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

export function CompaniesTable({ companies, onDelete, onRowClick, onCreateClick, sortKey, sortDirection, onSort }: CompaniesTableProps) {
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
              label="Nombre"
              sortKey="nombre"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="w-[50%] md:w-[25%]"
            />
            <SortableTableHead
              label="Tamaño"
              sortKey="tamaño"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[10%]"
            />
            <SortableTableHead
              label="Tipo"
              sortKey="tipo"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[12%]"
            />
            <TableHead className="hidden md:table-cell md:w-[10%] text-center">Prods.</TableHead>
            <SortableTableHead
              label="Estado"
              sortKey="estado"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[10%]"
            />
            <SortableTableHead
              label="Creación"
              sortKey="createdAt"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell md:w-[13%]"
            />
            <TableHead className="w-[50%] md:w-[20%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-[400px] p-0">
                <EmptyState
                  icon={Building2}
                  title="No hay empresas registradas"
                  description="Comienza agregando tu primera empresa cliente para gestionar sus campañas y reportes"
                  actionLabel={onCreateClick ? "Nueva Empresa" : undefined}
                  onAction={onCreateClick}
                />
              </TableCell>
            </TableRow>
          ) : (
            companies.map((company) => (
              <TableRow
                key={company.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => onRowClick(company.id)}
              >
                <TableCell className="font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[140px] md:max-w-[200px]">{company.nombre}</div>
                    </TooltipTrigger>
                    <TooltipContent>{company.nombre}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className={sizeColors[company.tamaño]}>
                    {company.tamaño.charAt(0).toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell truncate max-w-[100px]">{company.tipo}</TableCell>
                <TableCell className="hidden md:table-cell text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm cursor-help">{company.cantidad}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-semibold mb-1">Productos:</p>
                        <p>{company.productos.join(", ")}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge
                    variant={company.estado === "activa" ? "default" : "outline"}
                    className={
                      company.estado === "activa"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : ""
                    }
                  >
                    {company.estado === "activa" ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{formatDate(company.fechaCreacion)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(company.id)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}