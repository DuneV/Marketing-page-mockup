// components/admin/campaign-detail-modal.tsx

"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  Building2,
  User,
  FileText,
  Target,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  downloadTemplate,
  createImport,
  analyzeImport,
  commitImport,
  replaceCampaignExcel,
  commitImportFromPrevious,
  getLatestCampaignImport,
  listCampaignImports,
} from "@/lib/api/importApi"
import type { Campaign } from "@/types/campaign"

interface CampaignDetailModalProps {
  campaign: Campaign | null
  isOpen: boolean
  onClose: () => void
}

type LatestInfo = {
  filename: string
  status: string
  createdAt: string
}

type ImportVersion = {
  id: string
  filename?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

const statusColors: Record<string, string> = {
  planificacion: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  activa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  completada: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

const statusLabels: Record<string, string> = {
  planificacion: "Planificación",
  activa: "Activa",
  completada: "Completada",
  cancelada: "Cancelada",
}

// ============================
// Helpers Google Sheets (igual Create)
// ============================
function parseGoogleSheetsUrl(url: string): { spreadsheetId: string; gid?: string } | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!m) return null
  const spreadsheetId = m[1]
  const gidMatch = url.match(/[?#]gid=(\d+)/) || url.match(/[?&]gid=(\d+)/)
  const gid = gidMatch?.[1]
  return { spreadsheetId, gid }
}

function buildExportXlsxUrl(spreadsheetId: string, gid?: string) {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`
  return gid ? `${base}&gid=${gid}` : base
}

export function CampaignDetailModal({ campaign, isOpen, onClose }: CampaignDetailModalProps) {
  // Hooks SIEMPRE arriba, sin returns antes.
  const [file, setFile] = useState<File | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [uploadLog, setUploadLog] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [latest, setLatest] = useState<LatestInfo | null>(null)
  const [versions, setVersions] = useState<ImportVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  // ✅ NUEVO: URL de Google Sheets (NO se guarda en campaña; solo para importar)
  const [sheetUrl, setSheetUrl] = useState<string>("")

  const campaignId = campaign?.id ?? null
  const companyId = campaign?.empresaId ?? null

  const appendLog = (message: string) => {
    setUploadLog((prev) => `${prev}${message}\n`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // ✅ Fecha “última versión” para Info Adicional
  const latestVersionDateStr =
    latest?.createdAt ||
    versions?.[0]?.createdAt ||
    versions?.[0]?.updatedAt ||
    null

  // useEffect SIEMPRE se declara, y adentro haces el guard.
  useEffect(() => {
    if (!isOpen || !campaignId) return

    ;(async () => {
      try {
        // 1) Latest
        const r = await getLatestCampaignImport(campaignId)
        if (r?.exists && r?.latest) {
          setLatest({
            filename: r.latest.filename,
            status: r.latest.status,
            createdAt: r.latest.createdAt,
          })
        } else {
          setLatest(null)
        }

        // 2) Versions
        const v = await listCampaignImports(campaignId)
        const imports: ImportVersion[] = (v?.imports ?? []).map((it: any) => ({
          id: it.id,
          filename: it.filename ?? it.originalFilename ?? it.original_filename,
          status: it.status,
          createdAt: it.createdAt ?? it.created_at,
          updatedAt: it.updatedAt ?? it.updated_at,
        }))

        setVersions(imports)
        setSelectedVersionId(imports[0]?.id ?? null) // asumiendo orden desc
      } catch {
        setLatest(null)
        setVersions([])
        setSelectedVersionId(null)
      }
    })()
  }, [isOpen, campaignId])

  // Ahora sí, puedes hacer early return (después de hooks)
  if (!campaign) return null

  // ============================
  // ✅ NUEVO: cargar XLSX desde Google Sheets (via proxy)
  // ============================
  const handleLoadFromGoogleSheets = async () => {
    const url = sheetUrl.trim()
    if (!url) {
      toast.error("Pega una URL de Google Sheets")
      return
    }

    const parsed = parseGoogleSheetsUrl(url)
    if (!parsed) {
      toast.error("URL inválida. Debe ser un link de Google Sheets")
      return
    }

    try {
      setIsUploading(true)
      appendLog("📎 Leyendo Google Sheets...")

      const exportUrl = buildExportXlsxUrl(parsed.spreadsheetId, parsed.gid)

      // Proxy server-side para evitar CORS
      const resp = await fetch(`/api/sheets-proxy?url=${encodeURIComponent(exportUrl)}`)
      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(errText || `Error descargando sheet: ${resp.status}`)
      }

      const blob = await resp.blob()
      const filename = `${campaign.nombre.replace(/\s+/g, "_")}_from_sheets.xlsx`

      const asFile = new File([blob], filename, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // deja el file listo para los flujos existentes
      setFile(asFile)
      setImportId(null)
      setPreview(null)
      setMapping({})
      setUploadLog(`✓ Sheet convertido a XLSX: ${filename}\n`)

      toast.success("Sheet cargado", { description: "Ahora puedes Subir y Analizar o Actualizar Excel (auto)" })
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message ?? "Error leyendo Google Sheets")
      appendLog(`ERROR: ${e?.message ?? e}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Descargar plantilla específica para esta campaña
  const handleDownloadTemplate = async () => {
    try {
      setIsUploading(true)
      const blob = await downloadTemplate(campaign.empresaId, "campaigns")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${campaign.nombre.replace(/\s+/g, "_")}_plantilla.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Plantilla descargada", { description: `Plantilla para ${campaign.nombre}` })
    } catch (e: any) {
      toast.error(e?.message ?? "Error al descargar plantilla")
      appendLog(`ERROR: ${e?.message ?? e}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Seleccionar archivo
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

  // Subir y analizar archivo (flujo manual)
  const handleUploadFile = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero")
      return
    }
    if (!companyId) {
      toast.error("Falta companyId en la campaña")
      return
    }
    if (!campaignId) {
      toast.error("Falta campaignId")
      return
    }

    try {
      setIsUploading(true)
      appendLog("1) Creando importación...")

      // ✅ IMPORTANT: asociar a campaignId (como en Create)
      const { importId: newImportId, uploadUrl } = await createImport({
        companyId,
        importType: "campaigns",
        filename: file.name,
        campaignId,
      })

      setImportId(newImportId)
      appendLog("✓ Importación creada")

      appendLog("2) Subiendo archivo a GCS...")
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type":
            file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: file,
      })

      if (!uploadResponse.ok) throw new Error(await uploadResponse.text())
      appendLog("✓ Archivo subido correctamente")

      appendLog("3) Analizando datos...")
      const analyzed = await analyzeImport(newImportId)
      setPreview(analyzed)
      setMapping(analyzed.suggestions ?? {})
      appendLog("✓ Análisis completado")

      toast.success("Archivo analizado", { description: "Revisa el mapeo de columnas y confirma" })
    } catch (e: any) {
      toast.error(e?.message ?? "Error al procesar archivo")
      appendLog(`ERROR: ${e?.message ?? e}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Confirmar importación (flujo manual)
  const handleConfirmImport = async () => {
    if (!importId) return

    try {
      setIsUploading(true)
      appendLog("4) Confirmando importación...")

      await commitImport(importId, mapping)

      appendLog("✓ Importación confirmada")
      appendLog("Los datos se procesarán en segundo plano")

      toast.success("Importación iniciada", { description: "Los datos se están procesando" })

      // refrescar latest/versions para que Info Adicional use la “última versión”
      try {
        if (campaignId) {
          const r = await getLatestCampaignImport(campaignId)
          if (r?.exists && r?.latest) {
            setLatest({
              filename: r.latest.filename,
              status: r.latest.status,
              createdAt: r.latest.createdAt,
            })
          }
          const v = await listCampaignImports(campaignId)
          const imports: ImportVersion[] = (v?.imports ?? []).map((it: any) => ({
            id: it.id,
            filename: it.filename ?? it.originalFilename ?? it.original_filename,
            status: it.status,
            createdAt: it.createdAt ?? it.created_at,
            updatedAt: it.updatedAt ?? it.updated_at,
          }))
          setVersions(imports)
          setSelectedVersionId(imports[0]?.id ?? null)
        }
      } catch {}

      setTimeout(() => {
        setFile(null)
        setImportId(null)
        setPreview(null)
        setMapping({})
      }, 2000)
    } catch (e: any) {
      toast.error(e?.message ?? "Error al confirmar importación")
      appendLog(`ERROR: ${e?.message ?? e}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Reemplazar Excel + commit automático copiando mapping anterior
  const handleReplaceAndAutoCommit = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero")
      return
    }
    if (!companyId || !campaignId) {
      toast.error("Faltan IDs de campaña/empresa")
      return
    }

    try {
      setIsUploading(true)
      setUploadLog("")
      appendLog("1) Reemplazando import anterior y creando nuevo import...")

      const created = await replaceCampaignExcel({
        campaignId,
        companyId,
        filename: file.name,
      })

      setImportId(created.importId)
      appendLog(`Import creado: ${created.importId}`)
      appendLog(`Imports anteriores borrados: ${created.deletedPreviousImports}`)

      appendLog("2) Subiendo XLSX a GCS (signed URL)...")
      const uploadResponse = await fetch(created.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type":
            file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        body: file,
      })

      if (!uploadResponse.ok) throw new Error(await uploadResponse.text())
      appendLog("Archivo subido correctamente")

      appendLog("3) Commit automático (copiando mapping anterior) + encolando procesamiento...")
      await commitImportFromPrevious(created.importId)
      appendLog("Importación iniciada (auto)")

      toast.success("Excel actualizado", {
        description: "Se reemplazó el anterior y se re-procesó con el mismo mapping.",
      })

      // refrescar versions/latest (para Info adicional)
      try {
        const v = await listCampaignImports(campaignId)
        const imports: ImportVersion[] = (v?.imports ?? []).map((it: any) => ({
          id: it.id,
          filename: it.filename ?? it.originalFilename ?? it.original_filename,
          status: it.status,
          createdAt: it.createdAt ?? it.created_at,
          updatedAt: it.updatedAt ?? it.updated_at,
        }))
        setVersions(imports)
        setSelectedVersionId(imports[0]?.id ?? null)
      } catch {}

      try {
        const r = await getLatestCampaignImport(campaignId)
        if (r?.exists && r?.latest) {
          setLatest({
            filename: r.latest.filename,
            status: r.latest.status,
            createdAt: r.latest.createdAt,
          })
        } else {
          setLatest(null)
        }
      } catch {}

      setTimeout(() => {
        setFile(null)
        setImportId(null)
        setPreview(null)
        setMapping({})
      }, 800)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      const isNoPrev = msg.includes("NO_PREVIOUS_IMPORT") || msg.includes("NO_PREVIOUS_MAPPING")

      if (isNoPrev) {
        toast.warning("No hay mapping previo", {
          description: "Se requiere análisis y mapeo manual (primera carga).",
        })
        appendLog("⚠ No hay mapping previo. Usa 'Subir y Analizar' + 'Confirmar Importación'.")
      } else {
        toast.error("Error al actualizar Excel", { description: msg })
      }

      appendLog(`ERROR: ${msg}`)
    } finally {
      setIsUploading(false)
    }
  }

  const schemaFields = Object.keys(preview?.schema?.canonicalFields ?? {})

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{campaign.nombre}</DialogTitle>
            <Badge variant="outline" className={statusColors[campaign.estado]}>
              {statusLabels[campaign.estado]}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="detalles" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalles">Detalles</TabsTrigger>
            <TabsTrigger value="info">Información Adicional</TabsTrigger>
            <TabsTrigger value="excel">
              <FileText className="h-4 w-4 mr-2" />
              Datos Excel
            </TabsTrigger>
          </TabsList>

          {/* TAB: Detalles */}
          <TabsContent value="detalles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Empresa</p>
                      <p className="text-base font-semibold">{campaign.empresaNombre}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Usuario Responsable
                      </p>
                      <p className="text-base font-semibold">{campaign.usuarioResponsableNombre}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Fecha de Inicio
                      </p>
                      <p className="text-base">{formatDate(campaign.fechaInicio)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de Fin</p>
                      <p className="text-base">{formatDate(campaign.fechaFin)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Descripción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {campaign.descripcion}
                </p>
              </CardContent>
            </Card>

            {campaign.objetivos && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Objetivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {campaign.objetivos}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Información Adicional */}
          <TabsContent value="info" className="space-y-4">
            {campaign.productosAsociados && campaign.productosAsociados.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Productos Asociados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {campaign.productosAsociados.map((producto, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {producto}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">ID de Campaña</span>
                  <span className="text-sm font-mono font-medium">{campaign.id}</span>
                </div>

                {campaign.bucketPath && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Ruta Bucket</span>
                    <span className="text-sm font-mono font-medium">{campaign.bucketPath}</span>
                  </div>
                )}

                {/* ✅ CAMBIO: ambas fechas = fecha de última versión */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Creada el</span>
                  <span className="text-sm font-medium">
                    {latestVersionDateStr ? formatDate(latestVersionDateStr) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Última actualización</span>
                  <span className="text-sm font-medium">
                    {latestVersionDateStr ? formatDate(latestVersionDateStr) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Datos Excel */}
          <TabsContent value="excel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Versiones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay imports para esta campaña.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVersionId(v.id)}
                        className={`w-full text-left border rounded p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 ${
                          selectedVersionId === v.id
                            ? "border-amber-600"
                            : "border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono truncate">{v.id}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.createdAt ? new Date(v.createdAt).toLocaleString("es-ES") : ""}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-1">
                          <div className="truncate">{v.filename ?? "(sin filename)"}</div>
                          <div className="text-xs">{v.status ?? ""}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plantilla de Datos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Descarga la plantilla Excel para esta campaña y complétala con los datos requeridos.
                </p>
                <Button onClick={handleDownloadTemplate} disabled={isUploading} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subir Datos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {latest ? (
                    <span>
                      Versión actual:{" "}
                      <span className="font-medium text-foreground">{latest.filename}</span> ·{" "}
                      {new Date(latest.createdAt).toLocaleString("es-ES")} · {latest.status}
                    </span>
                  ) : (
                    <span>Versión actual: (sin import)</span>
                  )}
                </div>

                {/* ✅ NUEVO: Google Sheets URL (igual Create) */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Importar desde Google Sheets (URL)</p>
                  <div className="flex gap-2">
                    <Input
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="Pega URL de Google Sheets (https://docs.google.com/spreadsheets/d/...)"
                      disabled={isUploading}
                    />
                    <Button variant="outline" onClick={handleLoadFromGoogleSheets} disabled={isUploading}>
                      Cargar URL
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El Sheet debe ser accesible por enlace. Esto NO se guarda en la campaña.
                  </p>
                </div>

                <div className="border-t pt-4" />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

                <div className="flex flex-wrap gap-2">
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

                  <Button
                    onClick={handleReplaceAndAutoCommit}
                    disabled={!file || isUploading}
                    variant="outline"
                    className="border-amber-600 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Actualizar Excel (auto)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {preview && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen del Análisis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{preview.headers?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Columnas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{preview.previewRows?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Filas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {preview.missingRequired?.length || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Faltantes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{preview.extraColumns?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Extra</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Mapeo de Columnas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(preview.headers ?? []).map((header: string) => (
                      <div key={header} className="flex items-center gap-2">
                        <span className="w-1/3 text-sm font-medium truncate">{header}</span>
                        <select
                          className="flex-1 border rounded px-2 py-1 text-sm bg-background"
                          value={mapping[header] ?? ""}
                          onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                        >
                          <option value="">(ignorar)</option>
                          {schemaFields.map((field: string) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
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
                <CardTitle className="text-lg">Log de Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded min-h-[100px] max-h-[200px] overflow-y-auto font-mono">
                  {uploadLog || "No hay actividad aún..."}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}