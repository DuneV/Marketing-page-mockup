"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Plus, TrendingUp, BarChart3 } from "lucide-react"
import { getAllCampaigns, deleteCampaign, deleteAllCampaignImages, deleteAllCampaignComments } from "@/lib/data/campaigns"
import { deleteCampaignImports, deleteCampaignReportConfig } from "@/lib/api/campaignApi"
import { getAllCompanies } from "@/lib/data/companies"
import { assignUserToCampaign } from "@/lib/data/users"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { CampaignsTable } from "@/components/admin/campaigns-table"
import { CreateCampaignModal } from "@/components/admin/create-campaign-modal"
import { EditCampaignModal } from "@/components/admin/edit-campaign-modal"
import { DeleteCampaignDialog } from "@/components/admin/delete-campaign-dialog"
import { CampaignDetailModal } from "@/components/admin/campaign-detail-modal"
import { ReportConfigBuilderCampaign } from "@/components/admin/report-config-builder-campaign"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { KPISkeleton } from "@/components/admin/kpi-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSearch, type FilterOption } from "@/components/admin/table-search"
import { toast } from "sonner"
import { useAuthRole } from "@/lib/auth/useAuthRole"
import type { Campaign } from "@/types/campaign"
import type { Company } from "@/types/company"

const statusFilterOptions: FilterOption[] = [
  { value: "planificacion", label: "Planificación" },
  { value: "activa", label: "Activa" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
]

export function CampaignsAdminView() {
  const { user, role } = useAuthRole()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [reportConfigCampaignId, setReportConfigCampaignId] = useState<string | null>(null)
  const [isReportConfigOpen, setIsReportConfigOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [loadedCampaigns, loadedCompanies] = await Promise.all([
        getAllCampaigns(),
        getAllCompanies(),
      ])
      setCampaigns(loadedCampaigns as Campaign[])
      setCompanies(loadedCompanies)
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDeleteCampaign = useCallback(async () => {
    if (!deleteCampaignId) return
    const campaign = campaigns.find((c) => c.id === deleteCampaignId)
    if (!campaign) return

    try {
      if (campaign.usuarioResponsableId) {
        await assignUserToCampaign(campaign.usuarioResponsableId, null)
      }
      await deleteCampaignImports(deleteCampaignId)
      await deleteCampaignReportConfig(deleteCampaignId)
      await deleteAllCampaignImages(deleteCampaignId)
      await deleteAllCampaignComments(deleteCampaignId)
      await deleteCampaign(deleteCampaignId)

      setDeleteCampaignId(null)
      toast.success("Campaña eliminada", {
        description: `${campaign.nombre} ha sido eliminada permanentemente`,
      })
      await loadData()
    } catch (error) {
      console.error("Error eliminando campaña:", error)
      toast.error("Error al eliminar campaña")
    }
  }, [deleteCampaignId, campaigns, loadData])

  const handleDeleteClick = useCallback((campaignId: string) => {
    setDeleteCampaignId(campaignId)
  }, [])

  const handleEditClick = useCallback((campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setIsEditModalOpen(true)
  }, [])

  const handleRowClick = useCallback((campaignId: string) => {
    setSelectedCampaignId(campaignId)
    setIsDetailModalOpen(true)
  }, [])

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false)
    setSelectedCampaignId(null)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false)
    setSelectedCampaignId(null)
  }, [])

  const handleReportConfigClick = useCallback((campaignId: string) => {
    setReportConfigCampaignId(campaignId)
    setIsReportConfigOpen(true)
  }, [])

  const handleReportConfigOpenChange = useCallback((open: boolean) => {
    setIsReportConfigOpen(open)
    if (!open) {
      setTimeout(() => setReportConfigCampaignId(null), 300)
    }
  }, [])

  const campaignsByCompany = useMemo(() => {
    if (role === "company" && user?.companyId) {
      return campaigns.filter(c => c.empresaId === user.companyId)
    }
    return campaigns
  }, [campaigns, role, user])

  const filteredCampaigns = useMemo(() => {
    return campaignsByCompany.filter((campaign) => {
      const matchesSearch =
        searchQuery === "" ||
        campaign.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.empresaNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.usuarioResponsableNombre.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || campaign.estado === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [campaignsByCompany, searchQuery, statusFilter])

  const totalCampaigns = campaignsByCompany.length
  const activeCampaigns = campaignsByCompany.filter((c) => c.estado === "activa").length

  const campaignsByStatus = useMemo(() => ({
    planificacion: campaignsByCompany.filter((c) => c.estado === "planificacion").length,
    activa: campaignsByCompany.filter((c) => c.estado === "activa").length,
    completada: campaignsByCompany.filter((c) => c.estado === "completada").length,
    cancelada: campaignsByCompany.filter((c) => c.estado === "cancelada").length,
  }), [campaignsByCompany])

  const campaignToDelete = deleteCampaignId
    ? campaigns.find((c) => c.id === deleteCampaignId) || null
    : null

  const selectedCampaign = selectedCampaignId
    ? campaigns.find((c) => c.id === selectedCampaignId) || null
    : null

  const reportConfigCampaign = reportConfigCampaignId
    ? campaigns.find((c) => c.id === reportConfigCampaignId) || null
    : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPISkeleton key={i} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <TableSkeleton columns={6} rows={5} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gestión de Campañas</h2>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Campaña
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminKPICard label="Total de Campañas" value={totalCampaigns} icon={Target} color="amber" />
        <AdminKPICard
          label="Campañas Activas"
          value={`${activeCampaigns} / ${totalCampaigns}`}
          icon={TrendingUp}
          color="red"
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
          <CardTitle className="flex items-center justify-between">
            <span>Campañas</span>
            {filteredCampaigns.length !== campaignsByCompany.length && (
              <span className="text-sm font-normal text-muted-foreground">
                Mostrando {filteredCampaigns.length} de {campaignsByCompany.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSearch
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nombre, empresa o responsable..."
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={statusFilterOptions}
            filterLabel="Estado"
          />
          <CampaignsTable
            campaigns={filteredCampaigns}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onRowClick={handleRowClick}
            onAssignUser={() => {}}
            onReportConfig={handleReportConfigClick}
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

      {/* Instancia única del builder — solo se monta cuando hay una campaña seleccionada */}
      {reportConfigCampaign && (
        <ReportConfigBuilderCampaign
          key={reportConfigCampaignId}
          campaign={reportConfigCampaign}
          open={isReportConfigOpen}
          onOpenChange={handleReportConfigOpenChange}
          onSaved={loadData}
        />
      )}
    </div>
  )
}