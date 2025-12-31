// components/admin/admin-layout.tsx

"use client"

import { ReactNode } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { AppSidebar } from "@/components/app-sidebar"


export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar userType="company" isAdmin={true} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background px-4">
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
