// src/components/dashboard/builder/AddDecorPng.tsx
"use client"

import React, { useRef } from "react"

type DashboardAssetImage = {
  id: string
  type: "image"
  gsUri: string
  x: number
  y: number
  w: number
  h: number
  z: number
  opacity?: number
  fit?: "contain" | "cover"
}

export function AddDecorPng({
  dashboardId,
  onAddAsset,
}: {
  dashboardId: string
  onAddAsset: (asset: DashboardAssetImage) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        + Decoración (PNG)
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          e.target.value = ""

          if (file.type !== "image/png") throw new Error("Solo PNG")
          if (file.size > 4 * 1024 * 1024) throw new Error("Máx 4MB")

          // 1) pedir signed upload url
          const r1 = await fetch("/api/gcs/decor-image-upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dashboardId, filename: file.name }),
          })
          if (!r1.ok) throw new Error(await r1.text())
          const { uploadUrl, gsUri, contentType } = await r1.json()

          // 2) subir via proxy (para evitar CORS del navegador)
          const buf = await file.arrayBuffer()
          const r2 = await fetch("/api/upload-proxy", {
            method: "PUT",
            headers: {
              "x-upload-url": uploadUrl,
              "x-content-type": contentType || "image/png",
            },
            body: buf,
          })
          if (!r2.ok) throw new Error(await r2.text())

          // 3) guardar asset en config (guardas gsUri, NO URL expirable)
          onAddAsset({
            id: crypto.randomUUID(),
            type: "image",
            gsUri,
            x: 0,
            y: 0,
            w: 6,
            h: 2,
            z: 10,
            opacity: 1,
            fit: "contain",
          })
        }}
      />
    </>
  )
}