"use client"

import { TableHead } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortableTableHeadProps {
  label: string
  sortKey: string
  currentSortKey: string | null
  sortDirection: "asc" | "desc"
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHead({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4 text-amber-600" />
          ) : (
            <ArrowDown className="h-4 w-4 text-amber-600" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  )
}
