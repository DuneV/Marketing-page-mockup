"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface FilterOption {
  value: string
  label: string
}

interface TableSearchProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterOptions?: FilterOption[]
  filterPlaceholder?: string
  filterLabel?: string
}

export function TableSearch({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filterValue,
  onFilterChange,
  filterOptions,
  filterPlaceholder = "Todos",
  filterLabel,
}: TableSearchProps) {
  const hasActiveFilters = searchValue || (filterValue && filterValue !== "all")

  const clearFilters = () => {
    onSearchChange("")
    if (onFilterChange) {
      onFilterChange("all")
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>

      {filterOptions && onFilterChange && (
        <div className="flex items-center gap-2">
          {filterLabel && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">{filterLabel}:</span>
          )}
          <Select value={filterValue || "all"} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filterPlaceholder}</SelectItem>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
