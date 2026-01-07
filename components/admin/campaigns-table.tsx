import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, UserPlus, Target } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Campaign } from "@/types/campaign"
import { EmptyState } from "./empty-state"
import { ReportConfigBuilderCampaign } from "./report-config-builder-campaign"

interface CampaignsTableProps {
  campaigns: Campaign[]
  onEdit: (campaignId: string) => void
  onDelete: (campaignId: string) => void
  onRowClick: (campaignId: string) => void
  onAssignUser: (campaignId: string) => void
  onReportConfig?: () => void
}

const statusColors = {
  planificacion: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  activa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  completada: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

const statusLabels = {
  planificacion: "Planificación",
  activa: "Activa",
  completada: "Completada",
  cancelada: "Cancelada",
}

export function CampaignsTable({ campaigns, onEdit, onDelete, onRowClick, onAssignUser, onReportConfig }: CampaignsTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[18%]">Nombre</TableHead>
            <TableHead className="w-[15%]">Empresa</TableHead>
            <TableHead className="w-[15%]">Usuario Responsable</TableHead>
            <TableHead className="w-[10%]">Estado</TableHead>
            <TableHead className="w-[15%]">Fechas</TableHead>
            <TableHead className="w-[12%] text-right">Presupuesto</TableHead>
            <TableHead className="w-[15%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-[400px] p-0">
                <EmptyState
                  icon={Target}
                  title="No hay campañas creadas"
                  description="Comienza creando tu primera campaña para gestionar proyectos de marketing"
                />
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((campaign) => (
              <TableRow
                key={campaign.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                onClick={() => onRowClick(campaign.id)}
              >
                <TableCell className="font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[180px]">{campaign.nombre}</div>
                    </TooltipTrigger>
                    <TooltipContent>{campaign.nombre}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[150px]">{campaign.empresaNombre}</div>
                    </TooltipTrigger>
                    <TooltipContent>{campaign.empresaNombre}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate max-w-[150px]">{campaign.usuarioResponsableNombre}</div>
                    </TooltipTrigger>
                    <TooltipContent>{campaign.usuarioResponsableNombre}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[campaign.estado]}>
                    {statusLabels[campaign.estado]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(campaign.fechaInicio)} - {formatDate(campaign.fechaFin)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(campaign.presupuesto)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <ReportConfigBuilderCampaign campaign={campaign} onSaved={onReportConfig} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(campaign.id)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAssignUser(campaign.id)
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Asignar Usuario</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(campaign.id)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
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
