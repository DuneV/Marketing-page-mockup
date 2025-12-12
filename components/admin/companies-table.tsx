import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { Company } from "@/types/company"

interface CompaniesTableProps {
  companies: Company[]
  onDelete: (companyId: string) => void
}

const sizeColors = {
  pequeño: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  mediano: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  grande: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  enterprise: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

export function CompaniesTable({ companies, onDelete }: CompaniesTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tamaño</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha Creación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                No hay empresas registradas
              </TableCell>
            </TableRow>
          ) : (
            companies.map((company) => (
              <TableRow key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <TableCell className="font-medium">{company.nombre}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sizeColors[company.tamaño]}>
                    {company.tamaño}
                  </Badge>
                </TableCell>
                <TableCell>{company.tipo}</TableCell>
                <TableCell>
                  <span className="text-sm" title={company.productos.join(", ")}>
                    {company.cantidad} producto{company.cantidad !== 1 ? "s" : ""}
                  </span>
                </TableCell>
                <TableCell>
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
                <TableCell>{formatDate(company.fechaCreacion)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(company.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
