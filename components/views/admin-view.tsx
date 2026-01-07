// app/components/views/admin-view.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSearch, type FilterOption } from "@/components/admin/table-search"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { CompaniesTable } from "@/components/admin/companies-table"
import type { CreateCompanyWithUserPayload } from "@/components/admin/create-company-modal"
import { CreateCompanyModal } from "@/components/admin/create-company-modal"
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog"
import { CompanyDetailModal } from "@/components/admin/company-detail-modal"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { KPISkeleton } from "@/components/admin/kpi-skeleton"
import { toast } from "sonner"
import { Shield, Plus, Building2, CheckCircle, Target, DollarSign, Upload } from "lucide-react"

import type { Company } from "@/types/company"
import { getAllCompanies, createCompanyWithUser, deleteCompany } from "@/lib/data/companies"

const statusFilterOptions: FilterOption[] = [
  { value: "activa", label: "Activa" },
  { value: "inactiva", label: "Inactiva" },
]

export function AdminView() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    loadCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCompanies = async () => {
    setIsLoading(true)
    try {
      const loadedCompanies = await getAllCompanies()
      setCompanies(Array.isArray(loadedCompanies) ? loadedCompanies : [])
    } catch (error: any) {
      console.warn("No hay empresas aún o endpoint vacío:", error)
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCompany = async (payload: CreateCompanyWithUserPayload) => {
    try {
      await createCompanyWithUser(payload)
      toast.success("Empresa creada")
      await loadCompanies()
    } catch (e: any) {
      console.error("Create company failed:", e)
      toast.error(e?.message ?? "Error al crear empresa")
      throw e
    }
  }

  const handleDeleteCompany = async () => {
    if (!deleteCompanyId) return

    const companyName = companies.find((c) => c.id === deleteCompanyId)?.nombre

    try {
      await deleteCompany(deleteCompanyId)
      setDeleteCompanyId(null)
      toast.success("Empresa eliminada", {
        description: `${companyName ?? "La empresa"} ha sido eliminada permanentemente`,
      })
      await loadCompanies()
    } catch (error) {
      console.error("Error eliminando empresa:", error)
      toast.error("Error al eliminar empresa")
    }
  }

  const handleDeleteClick = (companyId: string) => {
    setDeleteCompanyId(companyId)
  }

  const handleRowClick = (companyId: string) => {
    setSelectedCompanyId(companyId)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedCompanyId(null)
  }



  // Filtrado de empresas
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        searchQuery === "" ||
        company.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.tipo.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || company.estado === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [companies, searchQuery, statusFilter])

  const totalCompanies = companies.length
  const activeCompanies = companies.filter((c) => c.estado === "activa").length
  const totalCampaigns = companies.reduce((sum, c) => sum + (c.totalCampañas || 0), 0)
  const totalInvestment = companies.reduce((sum, c) => sum + (c.inversionTotal || 0), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const companyToDelete = deleteCompanyId ? companies.find((c) => c.id === deleteCompanyId) || null : null
  const selectedCompany = selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) || null : null

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
          <Shield className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gestión de Empresas</h2>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard label="Total de Empresas" value={totalCompanies} icon={Building2} color="amber" />
        <AdminKPICard
          label="Empresas Activas"
          value={`${activeCompanies} / ${totalCompanies}`}
          icon={CheckCircle}
          color="red"
        />
        <AdminKPICard label="Total Campañas" value={totalCampaigns} icon={Target} color="amber" />
        <AdminKPICard label="Inversión Total" value={formatCurrency(totalInvestment)} icon={DollarSign} color="red" />
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Empresas Clientes</span>
            {filteredCompanies.length !== companies.length && (
              <span className="text-sm font-normal text-muted-foreground">
                Mostrando {filteredCompanies.length} de {companies.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <TableSearch
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por nombre o tipo..."
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={statusFilterOptions}
            filterLabel="Estado"
          />

          <CompaniesTable
            companies={filteredCompanies}
            onDelete={handleDeleteClick}
            onRowClick={handleRowClick}

            onCreateClick={() => setIsCreateModalOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCompany}
      />

      <DeleteCompanyDialog
        company={companyToDelete}
        isOpen={deleteCompanyId !== null}
        onClose={() => setDeleteCompanyId(null)}
        onConfirm={handleDeleteCompany}
      />

      <CompanyDetailModal company={selectedCompany} isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} />
    </div>
  )
}
