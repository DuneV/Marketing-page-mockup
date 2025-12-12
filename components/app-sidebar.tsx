"use client"

import { LayoutDashboard, Target, Settings, Shield, LogOut, User, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
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

export type ViewType = "overview" | "campaigns" | "settings" | "admin" | "people" | "company" | "employee"

interface AppSidebarProps {
  activeView: ViewType
  onNavigate: (view: ViewType) => void
  userType: "employee" | "company"
}

export function AppSidebar({ activeView, onNavigate, userType }: AppSidebarProps) {
  const router = useRouter()
  const { setOpenMobile } = useSidebar()

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  const handleNavigate = (view: ViewType) => {
    onNavigate(view)
    // Close mobile sidebar after navigation
    setOpenMobile(false)
  }

  // Get user data from localStorage
  const getUserData = () => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user")
      if (user) {
        const userData = JSON.parse(user)
        return {
          name: userData.name || "Usuario",
          email: userData.email || "correo@gmail.com",
        }
      }
    }
    return { name: "Usuario", email: "correo@gmail.com" }
  }

  const userData = getUserData()

  const generalMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      view: "overview" as ViewType,
    },
    {
      title: "Campañas",
      icon: Target,
      view: "campaigns" as ViewType,
    },
    {
      title: "Configuración",
      icon: Settings,
      view: "settings" as ViewType,
    },
  ]

  const adminMenuItems = [
    {
      title: "Admin Panel",
      icon: Shield,
      view: "admin" as ViewType,
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-base text-sidebar-foreground">Marketing</span>
            <span className="font-bold text-base text-sidebar-foreground">Analytics</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenu>
            {generalMenuItems.map((item) => (
              <SidebarMenuItem key={item.view}>
                <SidebarMenuButton
                  isActive={activeView === item.view}
                  onClick={() => handleNavigate(item.view)}
                  tooltip={item.title}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {userType === "company" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={activeView === item.view}
                    onClick={() => handleNavigate(item.view)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
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
                    <User className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userData.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{userData.email}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
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
