import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, DollarSign, Building2, User, FileText, Target } from "lucide-react"
import type { Campaign } from "@/types/campaign"

interface CampaignDetailModalProps {
  campaign: Campaign | null
  isOpen: boolean
  onClose: () => void
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

export function CampaignDetailModal({ campaign, isOpen, onClose }: CampaignDetailModalProps) {
  if (!campaign) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{campaign.nombre}</DialogTitle>
            <Badge variant="outline" className={statusColors[campaign.estado]}>
              {statusLabels[campaign.estado]}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="detalles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detalles">Detalles</TabsTrigger>
            <TabsTrigger value="info">Información Adicional</TabsTrigger>
          </TabsList>

          <TabsContent value="detalles" className="space-y-4">
            {/* Info General */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Empresa</p>
                      <p className="text-base font-semibold">{campaign.empresaNombre}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Usuario Responsable</p>
                      <p className="text-base font-semibold">{campaign.usuarioResponsableNombre}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de Inicio</p>
                      <p className="text-base">{formatDate(campaign.fechaInicio)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de Fin</p>
                      <p className="text-base">{formatDate(campaign.fechaFin)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Presupuesto</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(campaign.presupuesto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Descripción */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Descripción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {campaign.descripcion}
                </p>
              </CardContent>
            </Card>

            {/* Objetivos */}
            {campaign.objetivos && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Objetivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {campaign.objetivos}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            {/* Productos Asociados */}
            {campaign.productosAsociados && campaign.productosAsociados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Productos Asociados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {campaign.productosAsociados.map((producto, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {producto}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estadísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">ID de Campaña</span>
                  <span className="text-sm font-mono font-medium">{campaign.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Creada el</span>
                  <span className="text-sm font-medium">
                    {campaign.createdAt ? formatDate(campaign.createdAt) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Última actualización</span>
                  <span className="text-sm font-medium">
                    {campaign.updatedAt ? formatDate(campaign.updatedAt) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
