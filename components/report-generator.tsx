"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReportData {
  kpis: { label: string; value: string }[]
  dateRange: string
}

export function ReportGenerator({ kpis, dateRange }: ReportData) {
  const generateMarkdown = () => {
    const content = `# Bavaria Marketing Campaign Report
Generated on: ${new Date().toLocaleDateString()}
Period: ${dateRange}

## Key Performance Indicators

${kpis.map((kpi) => `- **${kpi.label}**: ${kpi.value}`).join("\n")}

---
*Report generated from Bavaria Marketing Dashboard*
`
    downloadFile(content, "bavaria-report.md", "text/markdown")
  }

  const generateHTML = () => {
    const content = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bavaria Marketing Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1f2937; }
    h1 { color: #d97706; border-bottom: 3px solid #dc2626; padding-bottom: 10px; }
    h2 { color: #dc2626; margin-top: 30px; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; font-size: 16px; }
    strong { color: #d97706; }
    .meta { color: #6b7280; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Bavaria Marketing Campaign Report</h1>
  <p class="meta">Generated on: ${new Date().toLocaleDateString()}</p>
  <p class="meta">Period: ${dateRange}</p>
  
  <h2>Key Performance Indicators</h2>
  <ul>
    ${kpis.map((kpi) => `<li><strong>${kpi.label}:</strong> ${kpi.value}</li>`).join("")}
  </ul>
  
  <div class="meta" style="margin-top: 40px;">
    <p>Report generated from Bavaria Marketing Dashboard</p>
  </div>
</body>
</html>
`
    downloadFile(content, "bavaria-report.html", "text/html")
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={generateMarkdown}
        variant="outline"
        size="sm"
        className="gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <Download className="w-4 h-4" />
        Descargar MD
      </Button>
      <Button
        onClick={generateHTML}
        variant="outline"
        size="sm"
        className="gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <Download className="w-4 h-4" />
        Descargar HTML
      </Button>
    </div>
  )
}
