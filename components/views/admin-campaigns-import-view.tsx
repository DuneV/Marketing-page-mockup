"use client"

import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminKPICard } from "@/components/admin/admin-kpi-card"
import { UploadCloud, FileDown, CheckCircle, AlertCircle } from "lucide-react"
import { createImport, analyzeImport, commitImport, downloadTemplate } from "@/lib/importApi"

export function AdminCampaignsImportView() {
  const [clientId, setClientId] = useState("demo-client")
  const importType = "campaigns"

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [importId, setImportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [log, setLog] = useState<string>("")
  const [busy, setBusy] = useState(false)

  const appendLog = (s: string) => setLog((p) => p + s + "\n")
  const pickFile = () => fileInputRef.current?.click()

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      alert("Solo .xlsx")
      e.target.value = ""
      return
    }
    setFile(f)
    setImportId(null)
    setPreview(null)
    setMapping({})
    appendLog(`Archivo: ${f.name}`)
  }

  async function onDownloadTemplate() {
    try {
      setBusy(true)
      const blob = await downloadTemplate(clientId, importType)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${importType}-${clientId}-template.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      appendLog(`ERROR template: ${e?.message ?? e}`)
      alert(e?.message ?? "Error template")
    } finally {
      setBusy(false)
    }
  }

  async function onStart() {
    if (!file) return alert("Selecciona un .xlsx primero")

    try {
      setBusy(true)
      appendLog("1) create import…")
      const { importId, uploadUrl } = await createImport({ clientId, importType, filename: file.name })
      setImportId(importId)

      appendLog("2) upload to GCS…")
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        body: file,
      })
      if (!put.ok) throw new Error(await put.text())
      appendLog("Upload OK")

      appendLog("3) analyze…")
      const analyzed = await analyzeImport(importId)
      setPreview(analyzed)
      setMapping(analyzed.suggestions ?? {})
      appendLog("Analyze OK")
    } catch (e: any) {
      appendLog(`ERROR: ${e?.message ?? e}`)
      alert(e?.message ?? "Error")
    } finally {
      setBusy(false)
    }
  }

  async function onCommit() {
    if (!importId) return
    try {
      setBusy(true)
      appendLog("4) commit…")
      await commitImport(importId, mapping)
      appendLog("Commit OK (worker procesará)")
    } catch (e: any) {
      appendLog(`ERROR commit: ${e?.message ?? e}`)
      alert(e?.message ?? "Error commit")
    } finally {
      setBusy(false)
    }
  }

  const schemaFields = useMemo(() => Object.keys(preview?.schema?.canonicalFields ?? {}), [preview])

  const kpis = {
    headers: (preview?.headers ?? []).length,
    rows: (preview?.previewRows ?? []).length,
    missing: (preview?.missingRequired ?? []).length,
    extra: (preview?.extraColumns ?? []).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UploadCloud className="h-6 w-6 text-amber-600" />
        <h2 className="text-2xl font-bold">Campañas - Importación</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Template + Upload</CardTitle>
          <Button variant="outline" onClick={onDownloadTemplate} disabled={busy}>
            <FileDown className="h-4 w-4 mr-2" />
            Descargar template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm block mb-1">Client ID</label>
              <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFilePicked}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={pickFile} disabled={busy}>
                  Elegir archivo .xlsx
                </Button>
                <div className="text-sm text-slate-600 dark:text-slate-300 truncate">
                  {file ? file.name : "Ningún archivo seleccionado"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onStart} disabled={!file || busy} className="bg-amber-600 hover:bg-amber-700">
              Subir + Vista previa
            </Button>
            <Button onClick={onCommit} disabled={!importId || busy} className="bg-emerald-600 hover:bg-emerald-700">
              Confirmar (Commit)
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminKPICard label="Columnas" value={kpis.headers} icon={CheckCircle} color="amber" />
            <AdminKPICard label="Filas Preview" value={kpis.rows} icon={CheckCircle} color="red" />
            <AdminKPICard label="Faltan requeridas" value={kpis.missing} icon={AlertCircle} color="amber" />
            <AdminKPICard label="No mapeadas" value={kpis.extra} icon={AlertCircle} color="red" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vista previa</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(preview.previewRows, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapping (editable)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(preview.headers ?? []).map((h: string) => (
                <div key={h} className="flex items-center gap-2">
                  <div className="w-64 text-sm truncate">{h}</div>
                  <select
                    className="border rounded px-2 py-1 text-sm bg-transparent"
                    value={mapping[h] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                  >
                    <option value="">(ignorar)</option>
                    {schemaFields.map((f: string) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {preview.missingRequired?.length > 0 && (
                <p className="text-red-600 mt-2">
                  Faltan requeridas: {preview.missingRequired.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap">{log}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
