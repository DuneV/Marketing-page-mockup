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
  children: ReactNode
}

const pathTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/campaigns": "Campañas",
  "/settings": "Configuración",
  "/admin": "Admin Panel",
}

export function DashboardLayout({
  userType,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const title = pathTitles[pathname] || "Dashboard"

  return (
    <SidebarProvider>
      <AppSidebar userType={userType} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
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
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
