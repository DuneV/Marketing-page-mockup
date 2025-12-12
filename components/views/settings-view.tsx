"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export function SettingsView() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-600" />
            <CardTitle>Configuración</CardTitle>
          </div>
          <CardDescription>
            Ajusta las preferencias de tu cuenta y aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Vista de Configuración</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta sección está en desarrollo. Aquí podrás ajustar la configuración de tu cuenta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
