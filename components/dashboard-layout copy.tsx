// components/dashboard-layout.tsx

"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

interface DashboardLayoutProps {
  userType: "employee" | "company"
  isAdmin?: boolean
  children: ReactNode
}

const pathTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/campaigns": "Campañas",
  "/dashboard/settings": "Configuración",
  "/admin/dashboard": "Admin Panel - Dashboard",
  "/admin/campaigns": "Admin Panel - Campañas",
  "/admin/settings": "Admin Panel - Configuración",
  "/admin/companies": "Admin Panel - Empresas",
  "/admin/users": "Admin Panel - Usuarios",
}

export function DashboardLayout({
  userType,
  isAdmin = false,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const title = pathTitles[pathname] || "Dashboard"

  return (
    <SidebarProvider>
      <AppSidebar userType={userType} isAdmin={isAdmin} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-lg">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 bg-white dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
