"use client"

import { Users, Target } from "lucide-react"

interface Person {
  id: string
  name: string
  role: string
  email: string
  engagement: number
  campaigns: number
  status: "active" | "inactive"
}

const people: Person[] = [
  {
    id: "1",
    name: "Juan Martínez",
    role: "Gerente de Campaña",
    email: "juan.martinez@bavaria.com",
    engagement: 95,
    campaigns: 8,
    status: "active",
  },
  {
    id: "2",
    name: "Laura Sánchez",
    role: "Analista de Datos",
    email: "laura.sanchez@bavaria.com",
    engagement: 88,
    campaigns: 12,
    status: "active",
  },
  {
    id: "3",
    name: "Roberto Gómez",
    role: "Especialista en Contenido",
    email: "roberto.gomez@bavaria.com",
    engagement: 82,
    campaigns: 6,
    status: "active",
  },
  {
    id: "4",
    name: "Patricia Rodríguez",
    role: "Coordinadora de Medios",
    email: "patricia.rodriguez@bavaria.com",
    engagement: 91,
    campaigns: 15,
    status: "active",
  },
  {
    id: "5",
    name: "Miguel Hernández",
    role: "Designer Gráfico",
    email: "miguel.hernandez@bavaria.com",
    engagement: 75,
    campaigns: 5,
    status: "inactive",
  },
]

export function PeopleMonitoring() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Monitoreo de Personas</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
              <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Rol</th>
              <th className="text-center py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Engagement</th>
              <th className="text-center py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Campañas</th>
              <th className="text-center py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Estado</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr
                key={person.id}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-3 px-3 text-slate-900 dark:text-slate-50">{person.name}</td>
                <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{person.role}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${person.engagement}%` }} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{person.engagement}%</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300">
                    <Target className="w-4 h-4 text-red-600" />
                    {person.campaigns}
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      person.status === "active"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {person.status === "active" ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
