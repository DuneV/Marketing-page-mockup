"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"

interface BreadcrumbItem {
  label: string
  href: string
}

const routeMap: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  companies: "Empresas",
  campaigns: "Campañas",
  users: "Usuarios",
  settings: "Configuración",
}

export function Breadcrumbs() {
  const pathname = usePathname()

  // Generar breadcrumbs basados en la ruta actual
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split("/").filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    let href = ""
    for (const path of paths) {
      href += `/${path}`
      const label = routeMap[path] || path.charAt(0).toUpperCase() + path.slice(1)
      breadcrumbs.push({ label, href })
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // No mostrar breadcrumbs en la página principal de admin
  if (pathname === "/admin" || breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/admin"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1

        return (
          <Fragment key={crumb.href}>
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
