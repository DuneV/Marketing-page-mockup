// components/dashboard-filters-bar.tsx

"use client"

import { Activity, Calendar, MapPin, Filter } from "lucide-react"

type Operator =
  | "eq" | "ne"
  | "gt" | "gte" | "lt" | "lte"
  | "contains" | "startsWith" | "endsWith"
  | "in" | "between"
  | "before" | "after"

export type FilterCondition = {
  campo: string
  operador: Operator
  valor: any
  label?: string
}

export type FilterOption = {
  campo: string
  options: Array<{ value: string; label: string }>
}

function iconForCampo(campo: string) {
  const c = (campo || "").toLowerCase()
  if (c.includes("city") || c.includes("ciudad")) return MapPin
  if (c.includes("date") || c.includes("fecha")) return Calendar
  if (c.includes("actividad") || c.includes("activity")) return Activity
  return Filter
}

function prettyCampoLabel(c: FilterCondition) {
  if (c.label) return c.label
  const name = c.campo || "Filtro"
  // Traducciones comunes
  if (name === "city") return "Ciudad"
  if (name === "date") return "Fecha"
  if (name === "actividad") return "Actividad"
  if (name === "promoter_or_seller_name") return "Promotor/Vendedor"
  if (name === "point_of_sale_name") return "Punto de Venta"
  if (name === "establishment_code") return "Código Establecimiento"
  return name
}

export function DashboardFiltersBar({
  conditions,
  filterOptions = [],
  loading,
  error,
  onApply,
  onClear,
  onChangeValor,
}: {
  conditions: FilterCondition[]
  filterOptions?: FilterOption[]
  loading: boolean
  error?: string | null
  onApply: () => void
  onClear: () => void
  onChangeValor: (idx: number, next: any) => void
}) {
  const hasFilters = (conditions ?? []).some(c => c?.campo)

  if (!hasFilters) return null

  function renderControl(c: FilterCondition, idx: number) {
    const op = c.operador
    const fieldOptions = filterOptions.find(f => f.campo === c.campo)

    // Si hay opciones disponibles y el operador soporta dropdown (eq, in)
    const useDropdown = fieldOptions?.options?.length && (op === "eq" || op === "in")

    if (useDropdown) {
      if (op === "eq") {
        return (
          <select
            className="w-full p-2 rounded border border-border bg-input text-foreground"
            value={String(c.valor ?? "")}
            onChange={(e) => onChangeValor(idx, e.target.value)}
          >
            <option value="">Todos</option>
            {fieldOptions.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )
      }

      if (op === "in") {
        // Multi-select con checkboxes (simplificado)
        const selected = Array.isArray(c.valor) ? c.valor : []
        
        return (
          <div className="max-h-40 overflow-y-auto border border-border rounded bg-background p-2 space-y-1">
            {fieldOptions.options.slice(0, 50).map(opt => {
              const isChecked = selected.includes(opt.value)
              return (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newSelected = e.target.checked
                        ? [...selected, opt.value]
                        : selected.filter(v => v !== opt.value)
                      onChangeValor(idx, newSelected)
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              )
            })}
            {fieldOptions.options.length > 50 && (
              <p className="text-xs text-muted-foreground px-2">
                Mostrando 50 de {fieldOptions.options.length} opciones
              </p>
            )}
          </div>
        )
      }
    }

    // Fallback a inputs tradicionales
    if (op === "between") {
      const inicio = c.valor?.inicio ?? ""
      const fin = c.valor?.fin ?? ""
      return (
        <div className="flex gap-2">
          <input
            className="w-full p-2 rounded border border-border bg-input text-foreground"
            placeholder="inicio (YYYY-MM-DD)"
            value={inicio}
            onChange={(e) => onChangeValor(idx, { inicio: e.target.value, fin })}
          />
          <input
            className="w-full p-2 rounded border border-border bg-input text-foreground"
            placeholder="fin (YYYY-MM-DD)"
            value={fin}
            onChange={(e) => onChangeValor(idx, { inicio, fin: e.target.value })}
          />
        </div>
      )
    }

    if (op === "in" && !useDropdown) {
      const s = Array.isArray(c.valor) ? c.valor.join(", ") : String(c.valor ?? "")
      return (
        <input
          className="w-full p-2 rounded border border-border bg-input text-foreground"
          placeholder="valores separados por coma"
          value={s}
          onChange={(e) => {
            const parts = e.target.value
              .split(",")
              .map(x => x.trim())
              .filter(Boolean)
            onChangeValor(idx, parts)
          }}
        />
      )
    }

    if (op === "before" || op === "after") {
      return (
        <input
          type="date"
          className="w-full p-2 rounded border border-border bg-input text-foreground"
          value={String(c.valor ?? "")}
          onChange={(e) => onChangeValor(idx, e.target.value)}
        />
      )
    }

    // Default: text input
    return (
      <input
        className="w-full p-2 rounded border border-border bg-input text-foreground"
        placeholder="valor"
        value={String(c.valor ?? "")}
        onChange={(e) => onChangeValor(idx, e.target.value)}
      />
    )
  }

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-2xl font-bold text-foreground">Filtros</h2>

        <div className="flex gap-3">
          <button
            onClick={onApply}
            disabled={loading}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:scale-105 bg-primary text-primary-foreground disabled:opacity-60 disabled:hover:scale-100"
          >
            <Filter size={18} />
            Aplicar filtros
          </button>

          <button
            onClick={onClear}
            disabled={loading}
            className="px-4 py-2 rounded-lg flex items-center gap-2 border border-border bg-card text-card-foreground transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {conditions.map((c, idx) => {
          if (!c?.campo) return null
          const Icon = iconForCampo(c.campo)

          return (
            <div key={`${c.campo}-${idx}`} className="p-4 rounded-lg bg-card border border-border">
              <label className="flex items-center gap-2 mb-2 font-semibold text-card-foreground">
                <Icon size={20} />
                {prettyCampoLabel(c)}
              </label>

              <div className="text-xs text-muted-foreground mb-2">
                Operador: <span className="font-medium text-foreground">{c.operador}</span>
              </div>

              {renderControl(c, idx)}
            </div>
          )
        })}
      </div>

      {!!error && (
        <div className="mt-4 text-sm text-red-600">{error}</div>
      )}
    </section>
  )
}