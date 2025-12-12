"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Check } from "lucide-react";
import { reportConfigStorage } from "@/lib/report-config-storage";
import type { Company } from "@/types/company";
import type { ServicePackage, CompanyServiceAssignment } from "@/types/report-config";

interface AssignServiceModalProps {
  company: Company;
  onAssigned?: () => void;
}

export function AssignServiceModal({ company, onAssigned }: AssignServiceModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<CompanyServiceAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Cargar paquetes disponibles
      const allPackages = reportConfigStorage.getAllServicePackages();
      setPackages(allPackages);

      // Cargar asignación actual
      const assignment = reportConfigStorage.getCompanyServiceAssignment(company.id);
      setCurrentAssignment(assignment);

      if (assignment) {
        setSelectedPackageId(assignment.paqueteId);
      }
    }
  }, [open, company.id]);

  const handleAssign = () => {
    if (!selectedPackageId) return;

    setIsLoading(true);

    try {
      reportConfigStorage.assignServiceToCompany({
        empresaId: company.id,
        paqueteId: selectedPackageId,
        fechaInicio: new Date().toISOString(),
      });

      setOpen(false);
      onAssigned?.();
    } catch (error) {
      console.error("Error asignando paquete:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Asignar Servicio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asignar Paquete de Servicio</DialogTitle>
          <DialogDescription>
            Configura el paquete de servicios para <strong>{company.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentAssignment && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">Paquete Actual</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {packages.find((p) => p.id === currentAssignment.paqueteId)?.nombre}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="package">Seleccionar Paquete</Label>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger id="package">
                <SelectValue placeholder="Selecciona un paquete" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{pkg.nombre}</span>
                      {pkg.precio && (
                        <span className="text-xs text-muted-foreground ml-4">
                          ${pkg.precio.toLocaleString("es-CO")}/mes
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPackage && (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h4 className="font-medium">{selectedPackage.nombre}</h4>
              <p className="text-sm text-muted-foreground">{selectedPackage.descripcion}</p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">KPIs Máximos</p>
                  <p className="text-lg font-semibold">{selectedPackage.maxKPIs}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Filas Máximas</p>
                  <p className="text-lg font-semibold">{selectedPackage.maxFilas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gráficos por Fila</p>
                  <p className="text-lg font-semibold">
                    {selectedPackage.maxGraficosPorFila}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipos de Gráficos</p>
                  <p className="text-lg font-semibold">
                    {selectedPackage.graficosPermitidos.length}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Gráficos Disponibles</p>
                <div className="flex flex-wrap gap-1">
                  {selectedPackage.graficosPermitidos.map((tipo) => (
                    <Badge key={tipo} variant="secondary" className="text-xs">
                      {tipo}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Fuentes de Datos</p>
                <div className="flex flex-wrap gap-1">
                  {selectedPackage.fuentesDatos.slice(0, 5).map((fuente) => (
                    <Badge key={fuente} variant="outline" className="text-xs">
                      {fuente}
                    </Badge>
                  ))}
                  {selectedPackage.fuentesDatos.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedPackage.fuentesDatos.length - 5} más
                    </Badge>
                  )}
                </div>
              </div>

              {selectedPackage.precio && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    Precio: ${selectedPackage.precio.toLocaleString("es-CO")}/mes
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={!selectedPackageId || isLoading}>
            {isLoading ? "Asignando..." : "Asignar Paquete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
