"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export function AdminView() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-600" />
            <CardTitle>Admin Panel</CardTitle>
          </div>
          <CardDescription>
            Panel de administración para gestión avanzada del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Panel de Administración</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta sección está en desarrollo. Aquí encontrarás herramientas de administración.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
