// lib/actions/filter-options.ts
'use server'

const IMPORT_API_URL = process.env.IMPORT_API_URL || "http://localhost:3002"

export async function getFilterOptionsAction(
  campaignId: string,
  fields: string[]
): Promise<{
  options: Record<string, Array<{ value: string; label: string }>>
  importId: string | null
  error?: string
}> {
  try {
    const fieldsParam = fields.join(",")
    const url = `${IMPORT_API_URL}/campaigns/${campaignId}/filter-options?fields=${encodeURIComponent(fieldsParam)}`
    
    console.log("🔍 Server Action - Fetching filter options:", url)

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // No cachear para tener datos frescos
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Backend error:", errorText)
      return {
        options: {},
        importId: null,
        error: errorText || `HTTP ${response.status}`
      }
    }

    const data = await response.json()
    console.log("✅ Filter options loaded:", Object.keys(data.options || {}))
    
    return {
      options: data.options || {},
      importId: data.importId || null,
    }
  } catch (error: any) {
    console.error("💥 Server Action error:", error)
    return {
      options: {},
      importId: null,
      error: error?.message || String(error)
    }
  }
}