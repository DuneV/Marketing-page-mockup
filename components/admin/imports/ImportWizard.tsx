// components/admin/imports/ImportWizard.tsx


"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { auth } from "@/lib/firebase/client"

type AnalyzeResponse = {
  headers: string[]
  previewRows: Record<string, any>[]
  suggestions: Record<string, string>
  missingRequired: string[]
  extraColumns: string[]
  schema: { canonicalFields: Record<string, any> }
}

async function getIdToken() {
  const u = auth.currentUser
  if (!u) throw new Error("No auth")
  return await u.getIdToken()
}

export function ImportWizard({ importType }: { importType: string }) {
  const [clientId, setClientId] = useState("demo-client") // aquí pones el cliente real
  const [file, setFile] = useState<File | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [analyze, setAnalyze] = useState<AnalyzeResponse | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const canonicalOptions = useMemo(() => {
    const fields = analyze?.schema?.canonicalFields ? Object.keys(analyze.schema.canonicalFields) : []
    return fields
  }, [analyze])

  const downloadTemplate = async () => {
    const token = await getIdToken()
    const res = await fetch(`/api/admin/imports/template?clientId=${encodeURIComponent(clientId)}&type=${encodeURIComponent(importType)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      toast.error("No se pudo descargar template")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${importType}-${clientId}-template.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const createImportAndUpload = async () => {
    if (!file) return toast.error("Selecciona un archivo")
    setLoading(true)
    try {
      const token = await getIdToken()

      // 1) create import
      const res = await fetch(`/api/admin/imports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clientId, importType, filename: file.name }),
      })
      if (!res.ok) throw new Error("create import failed")
      const { importId, uploadUrl } = await res.json()
      setImportId(importId)

      // 2) upload to signed URL
      const up = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        body: file,
      })
      if (!up.ok) throw new Error("upload failed")

      toast.success("Archivo subido")
    } catch (e: any) {
      console.error(e)
      toast.error("Error subiendo archivo")
    } finally {
      setLoading(false)
    }
  }

  const analyzeImport = async () => {
    if (!importId) return toast.error("Primero sube el archivo")
    setLoading(true)
    try {
      const token = await getIdToken()
      const res = await fetch(`/api/admin/imports/${importId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("analyze failed")
      const data = (await res.json()) as AnalyzeResponse
      setAnalyze(data)
      setMapping(data.suggestions || {})
      toast.success("Análisis listo")
      if (data.missingRequired?.length) {
        toast.warning("Faltan columnas requeridas", { description: data.missingRequired.join(", ") })
      }
    } catch (e: any) {
      console.error(e)
      toast.error("Error analizando")
    } finally {
      setLoading(false)
    }
  }

  const commitImport = async () => {
    if (!importId) return
    setLoading(true)
    try {
      const token = await getIdToken()
      const res = await fetch(`/api/admin/imports/${importId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mapping }),
      })
      if (!res.ok) throw new Error("commit failed")
      toast.success("Importación en proceso")
    } catch (e: any) {
      console.error(e)
      toast.error("Error confirmando import")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar {importType} (Admin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="clientId" className="max-w-xs" />
            <Button variant="outline" onClick={downloadTemplate}>Descargar template</Button>
          </div>

          <div className="flex gap-2 items-center">
            <Input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button onClick={createImportAndUpload} disabled={loading || !file}>Subir</Button>
            <Button variant="outline" onClick={analyzeImport} disabled={loading || !importId}>Analizar</Button>
          </div>

          {analyze && (
            <div className="space-y-3">
              <div className="text-sm">
                <div><b>Headers detectados:</b> {analyze.headers.join(" | ")}</div>
                {analyze.extraColumns?.length ? <div><b>No mapeadas:</b> {analyze.extraColumns.join(", ")}</div> : null}
                {analyze.missingRequired?.length ? <div className="text-red-600"><b>Faltan requeridas:</b> {analyze.missingRequired.join(", ")}</div> : null}
              </div>

              {/* Mapping */}
              <div className="space-y-2">
                <div className="font-semibold">Mapeo de columnas</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {analyze.headers.map((h) => (
                    <div key={h} className="flex gap-2 items-center">
                      <div className="w-48 text-sm truncate">{h}</div>
                      <select
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={mapping[h] ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                      >
                        <option value="">(ignorar)</option>
                        {canonicalOptions.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <div className="font-semibold">Vista previa (primeras filas)</div>
                <div className="overflow-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {analyze.headers.map((h) => (
                          <th key={h} className="text-left p-2 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analyze.previewRows.slice(0, 20).map((r, idx) => (
                        <tr key={idx} className="border-b">
                          {analyze.headers.map((h) => (
                            <td key={h} className="p-2 whitespace-nowrap">{String(r[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button onClick={commitImport} disabled={loading}>
                Confirmar carga
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
