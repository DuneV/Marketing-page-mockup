"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Plus, TrendingUp, DollarSign, BarChart3 } from "lucide-react"
import { getAllCampaigns, deleteCampaign, deleteAllCampaignImages, deleteAllCampaignComments } from "@/lib/data/campaigns"
import { getAllCompanies, getCompany, decrementCompanyCampaignCount } from "@/lib/data/companies"
import { getUser, assignUserToCampaign } from "@/lib/data/users"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { CampaignsTable } from "@/components/admin/campaigns-table"
import { CreateCampaignModal } from "@/components/admin/create-campaign-modal"
import { EditCampaignModal } from "@/components/admin/edit-campaign-modal"
import { DeleteCampaignDialog } from "@/components/admin/delete-campaign-dialog"
import { CampaignDetailModal } from "@/components/admin/campaign-detail-modal"
import { AssignUserToCampaignModal } from "@/components/admin/assign-user-to-campaign-modal"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { KPISkeleton } from "@/components/admin/kpi-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { Campaign } from "@/types/campaign"
import type { Company } from "@/types/company"

export function CampaignsAdminView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignCampaignId, setAssignCampaignId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [loadedCampaigns, loadedCompanies] = await Promise.all([
        getAllCampaigns(),
        getAllCompanies(),
      ])

      // Enriquecer campañas con nombres denormalizados
      const enrichedCampaigns = await Promise.all(
        loadedCampaigns.map(async (campaign) => {
          const company = loadedCompanies.find((c) => c.id === campaign.empresaId)
          let usuarioNombre = "Usuario no encontrado"

          try {
            const user = await getUser(campaign.usuarioResponsableId)
            if (user) {
              usuarioNombre = user.nombre
            }
          } catch (error) {
            console.error("Error cargando usuario:", error)
          }

          return {
            ...campaign,
            empresaNombre: company?.nombre || "Empresa no encontrada",
            usuarioResponsableNombre: usuarioNombre,
          } as Campaign
        })
      )

      setCampaigns(enrichedCampaigns)
      setCompanies(loadedCompanies)
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!deleteCampaignId) return

    const campaign = campaigns.find((c) => c.id === deleteCampaignId)
    if (!campaign) return

    try {
      // 1. Desasignar usuario
      if (campaign.usuarioResponsableId) {
        await assignUserToCampaign(campaign.usuarioResponsableId, null)
      }

      // 2. Eliminar imágenes y comentarios
      await deleteAllCampaignImages(deleteCampaignId)
      await deleteAllCampaignComments(deleteCampaignId)

      // 3. Eliminar campaña
      await deleteCampaign(deleteCampaignId)

      // 4. Actualizar stats de empresa
      if (campaign.empresaId && campaign.presupuesto) {
        await decrementCompanyCampaignCount(campaign.empresaId, campaign.presupuesto)
      }

      setDeleteCampaignId(null)
      toast.success("Campaña eliminada", {
        description: `${campaign.nombre} ha sido eliminada permanentemente`,
      })
      await loadData()
    } catch (error) {
      console.error("Error eliminando campaña:", error)
      toast.error("Error al eliminar campaña")
    }
  }

  const handleDeleteClick = (campaignId: string) => {
    setDeleteCampaignId(campaignId)
  }

  const handleEditClick = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setIsEditModalOpen(true)
  }

  const handleRowClick = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setIsDetailModalOpen(true)
  }

  const handleAssignUserClick = (campaignId: string) => {
    setAssignCampaignId(campaignId)
    setIsAssignModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedCampaignId(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedCampaignId(null)
  }

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false)
    setAssignCampaignId(null)
  }

  // KPI calculations
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.estado === "activa").length
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.presupuesto || 0), 0)

  const campaignsByStatus = {
    planificacion: campaigns.filter((c) => c.estado === "planificacion").length,
    activa: campaigns.filter((c) => c.estado === "activa").length,
    completada: campaigns.filter((c) => c.estado === "completada").length,
    cancelada: campaigns.filter((c) => c.estado === "cancelada").length,
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const campaignToDelete = deleteCampaignId
    ? campaigns.find((c) => c.id === deleteCampaignId) || null
    : null
  const selectedCampaign = selectedCampaignId
    ? campaigns.find((c) => c.id === selectedCampaignId) || null
    : null
  const assignCampaign = assignCampaignId
    ? campaigns.find((c) => c.id === assignCampaignId) || null
    : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gestión de Campañas</h2>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Campaña
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard label="Total de Campañas" value={totalCampaigns} icon={Target} color="amber" />
        <AdminKPICard
          label="Campañas Activas"
          value={`${activeCampaigns} / ${totalCampaigns}`}
          icon={TrendingUp}
          color="red"
        />
        <AdminKPICard
          label="Presupuesto Total"
          value={formatCurrency(totalBudget)}
          icon={DollarSign}
          color="amber"
        />
        <AdminKPICard
          label="Por Estado"
          value={`${campaignsByStatus.planificacion}P / ${campaignsByStatus.activa}A / ${campaignsByStatus.completada}C`}
          icon={BarChart3}
          color="red"
        />
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campañas</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignsTable
            campaigns={campaigns}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onRowClick={handleRowClick}
            onAssignUser={handleAssignUserClick}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadData}
        companies={companies}
      />

      <EditCampaignModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={loadData}
        campaign={selectedCampaign}
        companies={companies}
      />

      <DeleteCampaignDialog
        campaign={campaignToDelete}
        isOpen={deleteCampaignId !== null}
        onClose={() => setDeleteCampaignId(null)}
        onConfirm={handleDeleteCampaign}
      />

      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />

      <AssignUserToCampaignModal
        campaign={assignCampaign}
        isOpen={isAssignModalOpen}
        onClose={handleCloseAssignModal}
        onSuccess={loadData}
      />
    </div>
  )
}
