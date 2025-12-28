"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, Building2, Users, Target, Settings } from "lucide-react"

const items = [
  { href: "/admin/companies", label: "Empresas", icon: Building2 },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/campaigns", label: "Campañas", icon: Target },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-background">
      <div className="p-4 border-b flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-600" />
        <span className="font-semibold">Admin</span>
      </div>

      <nav className="p-2 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-slate-200 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-900",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
