// src/components/dashboard/useSignedReadUrl.ts
"use client"

import { useEffect, useState } from "react"

export function useSignedReadUrl(gsUri?: string) {
  const [url, setUrl] = useState<string>("")
  useEffect(() => {
    if (!gsUri) return

    let alive = true
    ;(async () => {
      const r = await fetch(`/api/gcs/signed-read?gsUri=${encodeURIComponent(gsUri)}`)
      if (!r.ok) return
      const { url } = await r.json()
      if (alive) setUrl(url)
    })()

    return () => {
      alive = false
    }
  }, [gsUri])

  return url
}