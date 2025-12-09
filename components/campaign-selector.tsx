"use client"

import { useState } from "react"

interface Campaign {
  id: string
  name: string
  company: string
  status: "active" | "completed"
  startDate: string
}

const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Campaña Verano 2025",
    company: "Bavaria Marketing Agency",
    status: "active",
    startDate: "2025-01-15",
  },
  {
    id: "2",
    name: "Impulso Redes Sociales",
    company: "Digital Solutions Inc",
    status: "active",
    startDate: "2025-02-01",
  },
  {
    id: "3",
    name: "Reposicionamiento Marca",
    company: "Creative Minds Co",
    status: "completed",
    startDate: "2024-12-01",
  },
]

export function CampaignSelector() {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 h-full flex flex-col">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Seleccionar Campaña</label>
      <select
        value={selectedCampaign.id}
        onChange={(e) => {
          const campaign = campaigns.find((c) => c.id === e.target.value)
          if (campaign) setSelectedCampaign(campaign)
        }}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50"
      >
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name} - {campaign.company}
          </option>
        ))}
      </select>

      {/* Campaign Details */}
      <div className="mt-4 space-y-2 flex-grow">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Estado:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              selectedCampaign.status === "active"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {selectedCampaign.status === "active" ? "Activa" : "Completada"}
          </span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Inicio: {new Date(selectedCampaign.startDate).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
