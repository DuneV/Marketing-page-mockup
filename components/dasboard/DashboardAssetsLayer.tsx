// src/components/dashboard/DashboardAssetsLayer.tsx
"use client"

import React from "react"
import { useSignedReadUrl } from "./useSignedReadUrl"

type ImgAsset = {
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

function AssetImg({ asset }: { asset: ImgAsset }) {
  const url = useSignedReadUrl(asset.gsUri)

  if (!url) return null

  return (
    <div
      style={{
        position: "absolute",
        left: `${asset.x * 40}px`,
        top: `${asset.y * 40}px`,
        width: `${asset.w * 40}px`,
        height: `${asset.h * 40}px`,
        zIndex: asset.z ?? 1,
        opacity: asset.opacity ?? 1,
        pointerEvents: "none",
      }}
    >
      <img
        src={url}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: asset.fit ?? "contain" }}
      />
    </div>
  )
}

export function DashboardAssetsLayer({ assets }: { assets?: ImgAsset[] }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {assets?.filter((a) => a.type === "image").map((a) => (
        <AssetImg key={a.id} asset={a} />
      ))}
    </div>
  )
}