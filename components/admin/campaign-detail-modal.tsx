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
  deleteCampaignSlot,
} from "@/lib/api/importApi"
import { saveCampaignColumnMapping, mergeColumnMappings } from "@/lib/data/campaigns"
import { getAvailableFields } from "@/lib/api/campaignApi"
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
  sourceLabel?: string
  createdAt?: string
  updatedAt?: string
  summary?: { insertedToStaging?: number; [key: string]: any }
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

function SlotDataPreview({ campaignId, slotLabel }: { campaignId: string; slotLabel: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (rows.length > 0) { setOpen(true); return }
    setLoading(true)
    try {
      const { getCampaignDataset } = await import("@/lib/api/campaignApi")
      const data = await getCampaignDataset(campaignId)
      const slotRows = data.dataBySlot?.[slotLabel] ?? []
      setRows(slotRows.slice(0, 20)) // solo primeras 20
      setOpen(true)
    } catch (e) {
      toast.error("Error cargando preview")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="w-full mt-2 text-xs h-7" onClick={load} disabled={loading}>
        {loading ? "Cargando..." : "Ver datos importados"}
      </Button>
    )
  }

  const columns = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div className="mt-2 border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b">
        <span className="text-xs font-medium">Preview — primeras {rows.length} filas</span>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
      <div className="overflow-auto max-h-64 max-w-full">
      <div className="min-w-max">
        <table className="text-xs w-full">
          <thead>
            <tr className="border-b bg-muted/20">
              {columns.map(col => (
                <th key={col} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                  <div>{col}</div>
                  <div className="font-normal text-muted-foreground">
                    {typeof rows[0]?.[col] === "number" ? "number" 
                      : rows[0]?.[col] === null ? "null"
                      : "string"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/10">
                {columns.map(col => (
                  <td key={col} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate" title={String(row[col] ?? "")}>
                    {row[col] === null ? <span className="text-muted-foreground italic">null</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "(ignorar)",
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border rounded px-2 py-1 text-sm bg-background text-left flex items-center justify-between gap-1"
      >
        <span className={`truncate ${value ? "" : "text-muted-foreground"}`}>
          {value || placeholder}
        </span>
        <svg
          className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded shadow-lg max-h-64 flex flex-col">
          <div className="p-1.5 border-b shrink-0">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar campo..."
              className="w-full px-2 py-1 text-sm border rounded bg-background"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto">
            <div
              onClick={() => {
                onChange("")
                setOpen(false)
                setSearch("")
              }}
              className="px-2 py-1.5 text-sm cursor-pointer hover:bg-muted text-muted-foreground"
            >
              (ignorar)
            </div>
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground italic">Sin resultados</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-muted ${
                    opt === value ? "bg-amber-50 dark:bg-amber-950/30 font-medium" : ""
                  }`}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function buildExportXlsxUrl(spreadsheetId: string, gid?: string) {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`
  return gid ? `${base}&gid=${gid}` : base
}

export function CampaignDetailModal({ campaign, isOpen, onClose }: CampaignDetailModalProps) {
  // Hooks SIEMPRE arriba, sin returns antes.
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null)
  const [isDeletingSlot, setIsDeletingSlot] = useState(false)
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
  const [activeSourceLabel, setActiveSourceLabel] = useState<string>("primary")
  const [availableSlots, setAvailableSlots] = useState<string[]>(["primary"])

  // Pestaña de relaciones
  const [mappingTabSlot, setMappingTabSlot] = useState<string>("primary")
  const [editableMapping, setEditableMapping] = useState<Record<string, string>>({})
  const [canonicalFields, setCanonicalFields] = useState<string[]>([])
  const [isSavingMapping, setIsSavingMapping] = useState(false)
  const [mappingDirty, setMappingDirty] = useState(false)

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
          sourceLabel: it.source_label ?? it.sourceLabel ?? "primary",
          createdAt: it.createdAt ?? it.created_at,
          updatedAt: it.updatedAt ?? it.updated_at,
          summary: it.summary ?? null,
        }))

        setVersions(imports)
        setSelectedVersionId(imports[0]?.id ?? null)

        // Slots únicos existentes
        const slots = Array.from(new Set(imports.map(i => (i as any).sourceLabel ?? "primary")))
        if (!slots.includes("primary")) slots.unshift("primary")
        setAvailableSlots(slots)

        // Cargar campos canónicos para el selector de mapeo
        try {
          const { fields } = await getAvailableFields(campaignId)
          const uniqueFieldNames = Array.from(new Set(fields.map(f => f.name))).sort()
          setCanonicalFields(uniqueFieldNames)
        } catch {
          setCanonicalFields([])
        }
      } catch {
        setLatest(null)
        setVersions([])
        setSelectedVersionId(null)
      }
    })()
  }, [isOpen, campaignId])

  // Sincronizar editableMapping cuando cambia el slot seleccionado
  useEffect(() => {
    const saved = campaign?.columnMapping?.[mappingTabSlot] ?? {}
    setEditableMapping({ ...saved })
    setMappingDirty(false)
  }, [mappingTabSlot, campaign?.columnMapping])

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
        sourceLabel: activeSourceLabel,
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

      const { mapping: mergedMapping, restoredCount, newCount } = mergeColumnMappings(
        campaign.columnMapping,
        activeSourceLabel,
        analyzed.headers ?? [],
        analyzed.suggestions ?? {}
      )
      setMapping(mergedMapping)

      appendLog("✓ Análisis completado")
      if (restoredCount > 0) appendLog(`✓ ${restoredCount} columna(s) restauradas del mapeo anterior`)
      if (newCount > 0) appendLog(`⚠ ${newCount} columna(s) nuevas — revisa el mapeo`)

      toast.success("Archivo analizado", {
        description: restoredCount > 0
          ? `${restoredCount} columnas pre-mapeadas, revisa las ${newCount} nuevas`
          : "Revisa el mapeo de columnas y confirma",
      })
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

      if (campaignId && Object.keys(mapping).length > 0) {
        try {
          await saveCampaignColumnMapping(campaignId, activeSourceLabel, mapping)
          appendLog("✓ Mapeo de columnas guardado para futuros uploads")
        } catch (mappingErr) {
          console.warn("No se pudo guardar el mapping:", mappingErr)
        }
      }

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
            sourceLabel: it.source_label ?? it.sourceLabel ?? "primary",
            createdAt: it.createdAt ?? it.created_at,
            updatedAt: it.updatedAt ?? it.updated_at,
            summary: it.summary ?? null,
          }))
          setVersions(imports)
          setSelectedVersionId(imports[0]?.id ?? null)
          const slots = Array.from(new Set(imports.map(i => i.sourceLabel ?? "primary")))
          if (!slots.includes("primary")) slots.unshift("primary")
          setAvailableSlots(slots)
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
        sourceLabel: activeSourceLabel,
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
          sourceLabel: it.source_label ?? it.sourceLabel ?? "primary",
          createdAt: it.createdAt ?? it.created_at,
          updatedAt: it.updatedAt ?? it.updated_at,
          summary: it.summary ?? null,
        }))
        setVersions(imports)
        setSelectedVersionId(imports[0]?.id ?? null)
        const slots = Array.from(new Set(imports.map(i => i.sourceLabel ?? "primary")))
        if (!slots.includes("primary")) slots.unshift("primary")
        setAvailableSlots(slots)
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

  const handleSaveEditableMapping = async () => {
    if (!campaignId) return
    setIsSavingMapping(true)
    try {
      await saveCampaignColumnMapping(campaignId, mappingTabSlot, editableMapping)
      setMappingDirty(false)
      toast.success("Mapeo guardado", {
        description: `Slot "${mappingTabSlot}" actualizado correctamente`,
      })
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar mapeo")
    } finally {
      setIsSavingMapping(false)
    }
  }
  const handleDeleteSlot = async (sourceLabel: string) => {
  if (!campaignId) return
  setIsDeletingSlot(true)
  try {
    await deleteCampaignSlot(campaignId, sourceLabel)
    setSlotToDelete(null)

    // Refrescar versiones y slots
    const v = await listCampaignImports(campaignId)
    const imports: ImportVersion[] = (v?.imports ?? []).map((it: any) => ({
      id: it.id,
      filename: it.filename ?? it.originalFilename ?? it.original_filename,
      status: it.status,
      sourceLabel: it.source_label ?? it.sourceLabel ?? "primary",
      createdAt: it.createdAt ?? it.created_at,
      updatedAt: it.updatedAt ?? it.updated_at,
      summary: it.summary ?? null,
    }))
    setVersions(imports)
    setSelectedVersionId(imports[0]?.id ?? null)

    const slots = Array.from(new Set(imports.map(i => (i as any).sourceLabel ?? "primary")))
    if (!slots.includes("primary")) slots.unshift("primary")
    setAvailableSlots(slots)

    // Si el slot activo era el que se borró, volver a primary
    if (activeSourceLabel === sourceLabel) setActiveSourceLabel("primary")
    if (mappingTabSlot === sourceLabel) setMappingTabSlot("primary")

    toast.success(`Slot "${sourceLabel}" eliminado`, {
      description: "Los imports, staging rows y mappings fueron borrados.",
    })
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar slot")
    } finally {
      setIsDeletingSlot(false)
    }
  }
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
          <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="excel">
            <FileText className="h-4 w-4 mr-2" />Excel
          </TabsTrigger>
          <TabsTrigger value="mapeo">Mapeo</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
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
            {(() => {
  // Agrupar versiones por slot
  const bySlot = new Map<string, ImportVersion[]>()
  for (const imp of versions) {
    const label = imp.sourceLabel ?? "primary"
    const arr = bySlot.get(label) ?? []
    arr.push(imp)
    bySlot.set(label, arr)
  }
 
  // Ordenar: primary primero, resto alfabético
  const slotEntries = Array.from(bySlot.entries()).sort(([a], [b]) => {
    if (a === "primary") return -1
    if (b === "primary") return 1
    return a.localeCompare(b)
  })
 
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Versiones por fuente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {slotEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay imports para esta campaña.
          </p>
        ) : (
          slotEntries.map(([slotLabel, slotImports]) => {
            // Última versión del slot (más reciente por updatedAt/createdAt)
            const sorted = [...slotImports].sort(
              (a, b) =>
                new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
                new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
            )
            const latest = sorted[0]
            const rows = latest.summary?.insertedToStaging ?? 0
            const versionCount = slotImports.length
 
            const relTime = (() => {
              const d = latest.updatedAt ?? latest.createdAt
              if (!d) return null
              try {
                const diff = Date.now() - new Date(d).getTime()
                const mins = Math.floor(diff / 60000)
                if (mins < 1) return "hace un momento"
                if (mins < 60) return `hace ${mins} min`
                const hrs = Math.floor(mins / 60)
                if (hrs < 24) return `hace ${hrs} h`
                const days = Math.floor(hrs / 24)
                return `hace ${days} día${days !== 1 ? "s" : ""}`
              } catch {
                return null
              }
            })()
 
            const statusColor =
              latest.status?.toUpperCase() === "DONE"
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                : latest.status?.toUpperCase() === "PROCESSING"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                : latest.status?.toUpperCase() === "FAILED" ||
                  latest.status?.toUpperCase() === "ERROR"
                ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                : "bg-slate-100 text-slate-600"
 
            return (
              <details key={slotLabel} className="border rounded-lg overflow-hidden group">
                {/* Summary = header siempre visible */}
                <summary className="flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 cursor-pointer list-none transition-colors">
                  {/* Icono expand */}
                  <svg
                    className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
 
                  {/* Nombre del slot */}
                  <span className="font-medium text-sm font-mono flex-1 truncate">
                    {slotLabel}
                  </span>
 
                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">
                      {versionCount} {versionCount === 1 ? "versión" : "versiones"}
                    </span>
 
                    {rows > 0 && (
                      <span className="text-xs border rounded-full px-2 py-0.5 text-muted-foreground">
                        {rows.toLocaleString("es-CO")} filas
                      </span>
                    )}
 
                    <span className={`text-xs rounded-full px-2 py-0.5 ${statusColor}`}>
                      {latest.status ?? "—"}
                    </span>
                  </div>
                </summary>
 
                {/* Detalle expandible */}
                <div className="px-4 py-3 border-t space-y-3 bg-background">
                  {/* Última versión */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Última versión
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                      <span className="font-mono text-xs truncate text-foreground">
                        {latest.filename ?? "(sin nombre)"}
                      </span>
                      {relTime && (
                        <span className="text-xs text-muted-foreground shrink-0">{relTime}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {latest.id}
                    </p>
                  </div>
 
                  {/* Resumen numérico */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold">
                        {rows > 0 ? rows.toLocaleString("es-CO") : "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Filas importadas</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold">{versionCount}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {versionCount === 1 ? "Versión" : "Versiones"}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold">
                        {latest.status?.toUpperCase() === "DONE" ? "✓" : "…"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Estado</p>
                    </div>
                  </div>
                  {/* Historial de versiones del slot */}
                  {versionCount > 1 && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Historial
                      </p>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {sorted.map((v, idx) => (
                          <div
                            key={v.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground py-0.5"
                          >
                            <span className="shrink-0 w-4 text-center font-mono">
                              {idx === 0 ? "●" : "○"}
                            </span>
                            <span className="truncate font-mono flex-1">
                              {v.filename ?? v.id}
                            </span>
                            <span className="shrink-0">
                              {v.createdAt
                                ? new Date(v.createdAt).toLocaleDateString("es-ES", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )
          })
        )}
      </CardContent>
    </Card>
  )
})()}
            {/* ── Fuentes de datos activas ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fuentes de datos activas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay slots registrados.</p>
                ) : (
                  availableSlots.map((slot) => {
                    const isPrimary = slot === "primary"
                    const isConfirming = slotToDelete === slot

                    return (
                      <div
                        key={slot}
                        className="flex items-center justify-between border rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium font-mono">{slot}</span>
                          {isPrimary && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                              principal
                            </span>
                          )}
                        </div>

                        {!isPrimary && (
                          <div className="flex items-center gap-2">
                            {isConfirming ? (
                              <>
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  ¿Eliminar todos los datos de este slot?
                                </span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  disabled={isDeletingSlot}
                                  onClick={() => handleDeleteSlot(slot)}
                                >
                                  {isDeletingSlot ? "Eliminando..." : "Confirmar"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={isDeletingSlot}
                                  onClick={() => setSlotToDelete(null)}
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => setSlotToDelete(slot)}
                              >
                                Eliminar slot
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
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
                {/* Selector de fuente/slot */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Fuente de datos (slot)</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setActiveSourceLabel(slot)}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                          activeSourceLabel === slot
                            ? "bg-amber-600 text-white border-amber-600"
                            : "border-slate-300 hover:border-amber-400 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full text-xs border border-dashed border-slate-300 hover:border-amber-400 text-slate-500 transition-colors"
                      onClick={() => {
                        const name = window.prompt("Nombre del nuevo slot (ej: ventas, inventario):")
                        if (!name?.trim()) return
                        const clean = name.trim().toLowerCase().replace(/\s+/g, "_")
                        if (!availableSlots.includes(clean)) {
                          setAvailableSlots(prev => [...prev, clean])
                        }
                        setActiveSourceLabel(clean)
                      }}
                    >
                      + Nueva fuente
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Slot activo: <strong>{activeSourceLabel}</strong> — los KPIs agregan sobre todos los slots; los gráficos usan el slot que declares en cada uno.
                  </p>
                </div>

                <div className="border-t pt-4" />

                {/* ✅ Google Sheets URL */}
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
                    {(preview.headers ?? []).map((header: string) => {
                      const isRestored = !!(campaign.columnMapping?.[activeSourceLabel]?.[header])
                      return (
                        <div key={header} className="flex items-center gap-2">
                          <span className={`w-1/3 text-sm font-medium truncate flex items-center gap-1 ${isRestored ? "text-green-600 dark:text-green-400" : ""}`}>
                            {header}
                            {isRestored && (
                              <span className="text-[10px] font-normal opacity-70 shrink-0">(guardado)</span>
                            )}
                          </span>
                          <SearchableSelect
                            value={mapping[header] ?? ""}
                            onChange={(val) => setMapping((m) => ({ ...m, [header]: val }))}
                            options={schemaFields}
                            className={`flex-1 ${isRestored ? "[&>button]:border-green-400 dark:[&>button]:border-green-700" : ""}`}
                          />
                        </div>
                      )
                    })}

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

        {/* TAB: Mapeo de Columnas */}
        <TabsContent value="mapeo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relaciones de Columnas por Slot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Aquí puedes ver y editar el mapeo guardado entre columnas del Excel y campos canónicos, por slot. Si subes el mismo archivo, estas relaciones se restauran automáticamente.
              </p>

              {/* Selector de slot */}
              <div className="flex flex-wrap gap-2 items-center">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setMappingTabSlot(slot)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      mappingTabSlot === slot
                        ? "bg-amber-600 text-white border-amber-600"
                        : "border-slate-300 hover:border-amber-400 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              {/* Tabla de mapeo */}
              {Object.keys(editableMapping).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                  No hay mapeo guardado para el slot <strong>{mappingTabSlot}</strong>.
                  <br />
                  Sube un Excel y confirma la importación para guardar las relaciones.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                    <div className="col-span-5">Columna del Excel</div>
                    <div className="col-span-1 text-center">→</div>
                    <div className="col-span-6">Campo canónico</div>
                  </div>
                  {Object.entries(editableMapping).map(([sourceCol, canonicalField]) => (
                    <div key={sourceCol} className="grid grid-cols-12 gap-2 items-center px-2">
                      <div className="col-span-5 text-sm font-mono truncate" title={sourceCol}>
                        {sourceCol}
                      </div>
                      <div className="col-span-1 text-center text-muted-foreground text-xs">→</div>
                      <div className="col-span-6">
                        <SearchableSelect
                          value={canonicalField}
                          onChange={(val) => {
                            setEditableMapping(prev => ({ ...prev, [sourceCol]: val }))
                            setMappingDirty(true)
                          }}
                          options={
                            canonicalField && !canonicalFields.includes(canonicalField)
                              ? [...canonicalFields, canonicalField]
                              : canonicalFields
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Estadísticas del mapeo */}
              {Object.keys(editableMapping).length > 0 && (
                <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
                  <span>
                    <strong className="text-foreground">
                      {Object.values(editableMapping).filter(Boolean).length}
                    </strong> mapeadas
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {Object.values(editableMapping).filter(v => !v).length}
                    </strong> ignoradas
                  </span>
                  <span>
                    <strong className="text-foreground">
                      {Object.keys(editableMapping).length}
                    </strong> columnas totales
                  </span>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveEditableMapping}
                  disabled={isSavingMapping || !mappingDirty}
                  className="bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  {isSavingMapping ? "Guardando..." : "Guardar cambios"}
                </Button>
                {mappingDirty && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const saved = campaign?.columnMapping?.[mappingTabSlot] ?? {}
                      setEditableMapping({ ...saved })
                      setMappingDirty(false)
                    }}
                  >
                    Descartar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="datos" className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {availableSlots.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => setActiveSourceLabel(slot)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  activeSourceLabel === slot
                    ? "bg-amber-600 text-white border-amber-600"
                    : "border-slate-300 text-slate-600 dark:text-slate-300"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
          {campaignId && (
            <SlotDataPreview campaignId={campaignId} slotLabel={activeSourceLabel} />
          )}
        </TabsContent>
      </Tabs>
    </DialogContent>
    </Dialog>
  )
}