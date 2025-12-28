// app/components/views/admin-view.tsx

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Plus, Building2, CheckCircle, Target, DollarSign, Database } from "lucide-react"
import { CompaniesStorage } from "@/lib/companies-storage"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { CompaniesTable } from "@/components/admin/companies-table"
import { CreateCompanyModal } from "@/components/admin/create-company-modal"
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog"
import { CompanyDetailModal } from "@/components/admin/company-detail-modal"
import { TableSkeleton } from "@/components/admin/table-skeleton"
import { KPISkeleton } from "@/components/admin/kpi-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { initDemoData } from "@/lib/init-demo-data"
import { toast } from "sonner"
import type { Company } from "@/types/company"

export function AdminView() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteCompanyId, setDeleteCompanyId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    CompaniesStorage.initialize()
    const loadedCompanies = CompaniesStorage.getAll()
    setCompanies(loadedCompanies)
    setIsLoading(false)
  }, [])

  const handleCreateCompany = (newCompany: Omit<Company, "id" | "fechaCreacion">) => {
    const created = CompaniesStorage.create(newCompany)
    setCompanies([...companies, created])
    toast.success("Empresa creada", {
      description: `${newCompany.nombre} ha sido agregada exitosamente`
    })
  }

  const handleDeleteCompany = () => {
    if (deleteCompanyId) {
      const companyName = companies.find(c => c.id === deleteCompanyId)?.nombre
      CompaniesStorage.delete(deleteCompanyId)
      setCompanies(companies.filter((c) => c.id !== deleteCompanyId))
      setDeleteCompanyId(null)
      toast.success("Empresa eliminada", {
        description: `${companyName} ha sido eliminada permanentemente`
      })
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

  const handleConfigChange = () => {
    // Recargar empresas si es necesario
    const loadedCompanies = CompaniesStorage.getAll()
    setCompanies(loadedCompanies)
  }

  const handleInitDemoData = () => {
    try {
      initDemoData()
      toast.success("Datos inicializados", {
        description: "Todas las empresas tienen paquetes y configuraciones asignadas"
      })
      handleConfigChange()
    } catch (error) {
      console.error("Error inicializando datos:", error)
      toast.error("Error al inicializar", {
        description: "No se pudieron cargar los datos de demostración"
      })
    }
  }

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
          <Button variant="outline" onClick={handleInitDemoData}>
            <Database className="h-4 w-4 mr-2" />
            Inicializar Datos Demo
          </Button>
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
          <CardTitle>Empresas Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <CompaniesTable
            companies={companies}
            onDelete={handleDeleteClick}
            onRowClick={handleRowClick}
            onConfigChange={handleConfigChange}
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

      <CompanyDetailModal
        company={selectedCompany}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  )
}
