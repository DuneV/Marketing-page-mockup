// components/admin/create-campaign-modal.tsx

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createCampaign } from "@/lib/data/campaigns"
import { assignUserToCampaign } from "@/lib/data/users"
import { incrementCompanyCampaignCount, getCompany } from "@/lib/data/companies"
import { downloadTemplate, createImport, analyzeImport, commitImport } from "@/lib/api/importApi"
import { toast } from "sonner"
import { useAuthRole } from "@/lib/auth/useAuthRole"
import { Download, Upload, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"
import type { Company } from "@/types/company"
import type { CampaignFormData } from "@/types/campaign"

const campaignSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  empresaId: z.string().min(1, "Empresa requerida"),
  estado: z.enum(["planificacion", "activa", "completada", "cancelada"]),
  fechaInicio: z.string().min(1, "Fecha de inicio requerida"),
  fechaFin: z.string().min(1, "Fecha fin requerida"),
  presupuesto: z.coerce.number().nonnegative("El presupuesto no puede ser negativo"),
  descripcion: z.string().min(1, "Descripción requerida"),
  objetivos: z.string().optional(),
  productosAsociados: z.string().optional(),
  bucketPath: z.string().optional(),
}).refine((data) => {
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio)
  }
  return true
}, {
  message: "La fecha fin debe ser posterior a la fecha de inicio",
  path: ["fechaFin"],
})

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companies: Company[]
}

type Step = "campaign" | "excel"

export function CreateCampaignModal({ isOpen, onClose, onSuccess, companies }: CreateCampaignModalProps) {
  const { user: currentUser } = useAuthRole()
  const [step, setStep] = useState<Step>("campaign")
  const [isLoading, setIsLoading] = useState(false)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")  // ✅ Este es el UUID/ID
  const [campaignName, setCampaignName] = useState<string>("")
  
  // Estados para Excel
  const [file, setFile] = useState<File | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [uploadLog, setUploadLog] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const form = useForm<CampaignFormData & { productosAsociados: string; bucketPath?: string }>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nombre: "",
      empresaId: "",
      estado: "planificacion",
      fechaInicio: "",
      fechaFin: "",
      presupuesto: 0,
      descripcion: "",
      objetivos: "",
      productosAsociados: "",
      bucketPath: "",
    },
  })

  const appendLog = (message: string) => {
    setUploadLog(prev => `${prev}${message}\n`)
  }

  const handleSubmit = async (data: CampaignFormData & { productosAsociados: string; bucketPath?: string }) => {
    if (!currentUser) {
      toast.error("Usuario no autenticado")
      return
    }

    setIsLoading(true)
    try {
      const productos = data.productosAsociados
        ? data.productosAsociados.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
        : []

      const selectedCompany = await getCompany(data.empresaId)
      
      console.log("🏢 Empresa seleccionada:", {
        empresaId: data.empresaId,
        empresaNombre: selectedCompany?.nombre
      })

      const bucketPath = data.bucketPath?.trim() || 
        `campaigns/${data.empresaId}/${Date.now()}_${data.nombre.replace(/\s+/g, '_').toLowerCase()}`

      const campaignId = await createCampaign(currentUser.uid, {
        nombre: data.nombre,
        empresaId: data.empresaId,
        empresaNombre: selectedCompany?.nombre || "Empresa desconocida",
        usuarioResponsableId: currentUser.uid,
        usuarioResponsableNombre: currentUser.nombre || "Admin",
        estado: data.estado,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        presupuesto: data.presupuesto,
        descripcion: data.descripcion,
        objetivos: data.objetivos,
        productosAsociados: productos,
        bucketPath,
      })

      await assignUserToCampaign(currentUser.uid, campaignId)
      await incrementCompanyCampaignCount(data.empresaId, data.presupuesto)

      setCreatedCampaignId(campaignId)
      setSelectedCompanyId(data.empresaId)  // ✅ Guardar el ID (UUID) de la empresa
      setCampaignName(data.nombre)
      
      console.log("✅ Campaña creada, empresa ID guardado:", data.empresaId)
      
      toast.success("Campaña creada", {
        description: `${data.nombre} - Ahora sube el archivo Excel`
      })

      setStep("excel")
    } catch (error) {
      console.error("Error creando campaña:", error)
      toast.error("Error al crear campaña")
    } finally {
      setIsLoading(false)
    }
  }

  // === FUNCIONES DE EXCEL ===
  const handleDownloadTemplate = async () => {
    if (!selectedCompanyId) {
      toast.error("No hay empresa seleccionada")
      return
    }

    try {
      setIsUploading(true)
      console.log("📥 Descargando plantilla para empresa:", selectedCompanyId)
      
      const blob = await downloadTemplate(selectedCompanyId, "campaigns")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${campaignName.replace(/\s+/g, '_')}_plantilla.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Plantilla descargada")
    } catch (e: any) {
      console.error("Error descargando plantilla:", e)
      toast.error(e?.message ?? "Error al descargar plantilla")
      appendLog(`ERROR: ${e?.message ?? e}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Solo se permiten archivos .xlsx")
      e.target.value = ""
      return
    }

    setFile(selectedFile)
    setImportId(null)
    setPreview(null)
    setMapping({})
    setUploadLog("")
    appendLog(`✓ Archivo seleccionado: ${selectedFile.name}`)
  }


const handleUploadFile = async () => {
  if (!file || !selectedCompanyId) {
    toast.error("Selecciona un archivo primero")
    return
  }

  try {
    setIsUploading(true)
    
    console.log("📤 Iniciando upload con:", {
      companyId: selectedCompanyId,
      importType: "campaigns",
      filename: file.name
    })
    
    appendLog("1) Creando importación...")
    appendLog(`   Company ID: ${selectedCompanyId}`)
    
    const { importId: newImportId, uploadUrl } = await createImport({
      companyId: selectedCompanyId,
      importType: "campaigns",
      filename: file.name,
    })
    
    setImportId(newImportId)
    appendLog("✓ Importación creada")

    appendLog("2) Subiendo archivo a GCS...")
    console.log("📤 Uploading file via proxy")
    
    const uploadResponse = await fetch("/api/upload-proxy", {
      method: "PUT",
      headers: {
        "x-upload-url": uploadUrl,
      },
      body: file,
    })

    console.log("📥 Upload response:", {
      status: uploadResponse.status,
      ok: uploadResponse.ok
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`)
    }
    
    appendLog("✓ Archivo subido correctamente")

    appendLog("3) Analizando datos...")
    console.log("🔍 Starting analysis for import:", newImportId)
    
    try {
      const analyzed = await analyzeImport(newImportId)
      console.log("✅ Analysis result:", analyzed)
      
      setPreview(analyzed)
      setMapping(analyzed.suggestions ?? {})
      appendLog("✓ Análisis completado")
      
      toast.success("Archivo analizado correctamente")
    } catch (analyzeError: any) {
      console.error("❌ Analysis failed:", analyzeError)
      appendLog(`ERROR en análisis: ${analyzeError.message}`)
      throw analyzeError
    }
    
  } catch (e: any) {
    console.error("Error procesando archivo:", e)
    toast.error(e?.message ?? "Error al procesar archivo")
    appendLog(`ERROR: ${e?.message ?? e}`)
  } finally {
    setIsUploading(false)
  }
}

  const handleConfirmImport = async () => {
    if (!importId) return

    try {
      setIsUploading(true)
      appendLog("4) Confirmando importación...")
      
      await commitImport(importId, mapping)
      
      appendLog("✓ Importación confirmada")
      toast.success("Campaña y datos creados exitosamente")

      setTimeout(() => {
        handleClose()
        onSuccess()
      }, 1000)
    } catch (e: any) {
      toast.error(e?.message ?? "Error al confirmar importación")
      appendLog(`ERROR: ${e?.message ?? e}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSkipExcel = () => {
    toast.success("Campaña creada sin archivo Excel")
    handleClose()
    onSuccess()
  }

  const handleClose = () => {
    form.reset()
    setStep("campaign")
    setCreatedCampaignId(null)
    setSelectedCompanyId("")
    setCampaignName("")
    setFile(null)
    setImportId(null)
    setPreview(null)
    setMapping({})
    setUploadLog("")
    onClose()
  }

  const schemaFields = Object.keys(preview?.schema?.canonicalFields ?? {})
  const progress = step === "campaign" ? 50 : 100

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "campaign" ? "Paso 1: Crear Campaña" : "Paso 2: Subir Datos Excel"}
          </DialogTitle>
          <DialogDescription>
            {step === "campaign" 
              ? "Completa los datos básicos de la campaña" 
              : `Sube el archivo Excel para: ${campaignName}`}
          </DialogDescription>
          <Progress value={progress} className="h-2 mt-2" />
        </DialogHeader>

        {/* PASO 1: Formulario de Campaña */}
        {step === "campaign" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {currentUser && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Responsable:</strong> {currentUser.nombre} (tú)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Campaña Verano 2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="empresaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona empresa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planificacion">Planificación</SelectItem>
                          <SelectItem value="activa">Activa</SelectItem>
                          <SelectItem value="completada">Completada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="presupuesto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presupuesto (COP) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fechaInicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Inicio *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fechaFin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Fin *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción *</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objetivos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productosAsociados"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Productos (separados por coma)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Ej: Águila, Poker, Club Colombia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isLoading}>
                  {isLoading ? "Creando..." : "Crear y Continuar"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* PASO 2: Subir Excel */}
        {step === "excel" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Descargar Plantilla</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownloadTemplate} disabled={isUploading} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla Excel
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Subir Archivo Completado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={onFileChange}
                  className="hidden"
                />
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleFileSelect} disabled={isUploading}>
                    Seleccionar Archivo
                  </Button>
                  <span className="text-sm text-muted-foreground truncate">
                    {file ? file.name : "Ningún archivo seleccionado"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleUploadFile} 
                    disabled={!file || isUploading} 
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir y Analizar
                  </Button>
                  
                  {preview && (
                    <Button 
                      onClick={handleConfirmImport} 
                      disabled={!importId || isUploading} 
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Importación
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {preview && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumen del Análisis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{preview.headers?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Columnas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{preview.previewRows?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Filas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">{preview.missingRequired?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Faltantes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{preview.extraColumns?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Extra</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mapeo de Columnas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(preview.headers ?? []).map((h: string) => (
                      <div key={h} className="flex items-center gap-2">
                        <span className="w-1/3 text-sm font-medium truncate">{h}</span>
                    <select
                      className="flex-1 border rounded px-2 py-1 text-sm bg-background"
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    >
                      <option value="">(ignorar)</option>
                      {schemaFields.map((f: string) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                ))}
                
                {preview.missingRequired?.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Faltan campos requeridos: {preview.missingRequired.join(", ")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log de Actividad</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded min-h-[100px] max-h-[150px] overflow-y-auto font-mono">
              {uploadLog || "Esperando acción..."}
            </pre>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleSkipExcel} disabled={isUploading}>
            Omitir Excel
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
)
}