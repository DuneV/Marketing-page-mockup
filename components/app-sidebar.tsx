// components/app-sidebar.tsx
"use client"

import Image from "next/image"
import LOGO from "@/public/logo.png"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"

import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/client"

import {
  LayoutDashboard,
  Target,
  Settings,
  Shield,
  LogOut,
  User,
  ChevronUp,
  Users,
  Menu,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppSidebarProps {
  userType: "employee" | "company"
  isAdmin?: boolean
}

export function AppSidebar({ userType, isAdmin = false }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const { setOpenMobile, open } = useSidebar()

  const handleLogout = async () => {
    await signOut(auth)
    router.replace("/auth/login")
  }

  const handleNavigation = () => setOpenMobile(false)

  const [userData, setUserData] = useState({ name: "Usuario", email: "correo@gmail.com" })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserData({
        name: u?.displayName ?? "Usuario",
        email: u?.email ?? "correo@gmail.com",
      })
    })
    return () => unsub()
  }, [])

  const dashboardHref = isAdmin ? "/admin/dashboard" : "/dashboard"
  const campaignsHref = isAdmin ? "/admin/campaigns" : "/dashboard/campaigns"
  const settingsHref = isAdmin ? "/admin/settings" : "/dashboard/settings"

  const isActiveRoute = (href: string) => {
    if (href === dashboardHref) return pathname === dashboardHref
    return pathname === href || pathname.startsWith(href + "/")
  }

  const generalMenuItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: dashboardHref },
    { title: "Configuración", icon: Settings, href: settingsHref },
  ]

  const adminMenuItems = [
    { title: "Empresas", icon: Shield, href: "/admin/companies" },
    // { title: "Usuarios", icon: Users, href: "/admin/users" },
    { title: "Campañas", icon: Target, href: "/admin/campaigns" },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-16 group-data-[collapsible=icon]:!size-16 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!items-center">
              <div className="relative h-8 w-8 shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7 transition-all">
                <Image src={LOGO} alt="Logo" fill className="object-contain" priority />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-base text-sidebar-foreground">MARATHON</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenu>
            {generalMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActiveRoute(item.href)} tooltip={item.title}>
                  <Link href={item.href} onClick={handleNavigation}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                    <Link href={item.href} onClick={handleNavigation}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent">
                    <User className="h-5 w-5" />
                  </div>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userData.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{userData.email}</span>
                  </div>

                  <ChevronUp className="ml-auto h-5 w-5" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}