"use client"

interface TabsCompanyProps {
  active: string
  setActive: (value: string) => void
}

export function TabsCompany({ active, setActive }: TabsCompanyProps) {
  const tabs = [
    { key: "overview", label: "Resumen" },
    { key: "people", label: "Personas" },
    { key: "company", label: "Empresa" },
  ]

  return (
    <div className="flex gap-8 border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setActive(t.key)}
          className={`py-4 border-b-2 transition-colors ${
            active === t.key
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
