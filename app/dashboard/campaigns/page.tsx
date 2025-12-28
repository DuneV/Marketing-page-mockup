"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function CampaignsPage() {
  return (
    <DashboardLayout userType="company" isAdmin={false}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Campañas</h1>

        <div className="rounded-xl border p-4">
          <p className="text-sm opacity-70">
            Aquí puedes listar tus campañas, filtrar por estado y crear nuevas.
          </p>
        </div>

        {/* Placeholder tabla/lista */}
        <div className="rounded-xl border p-4">
          <p className="font-medium mb-2">Listado</p>
          <p className="text-sm opacity-70">Pendiente: conectar con Firestore.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
