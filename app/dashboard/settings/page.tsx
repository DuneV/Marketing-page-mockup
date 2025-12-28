"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <DashboardLayout userType="company" isAdmin={false}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Configuración</h1>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-4">
            <Card className="p-4 space-y-4">
              <p className="font-medium">Preferencias del dashboard</p>

              <div className="space-y-2">
                <Label>Rango de fechas por defecto</Label>
                <Input placeholder='Ej: "30" (últimos 30 días)' />
              </div>

              <Button>Guardar cambios</Button>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="mt-4">
            <Card className="p-4 space-y-4">
              <p className="font-medium">Branding</p>
              <div className="space-y-2">
                <Label>Nombre visible</Label>
                <Input placeholder="Bavaria" />
              </div>
              <Button>Guardar</Button>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card className="p-4 space-y-4">
              <p className="font-medium">Alertas</p>
              <p className="text-sm opacity-70">
                Aquí luego puedes configurar notificaciones por bajo rendimiento, etc.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
