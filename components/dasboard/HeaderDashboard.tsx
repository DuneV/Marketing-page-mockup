"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"

export default function HeaderDashboard() {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Branding */}
        <div>
          <h1 className="text-2xl font-bold text-amber-600">Bavaria</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Marketing Campaign Tracker</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Cerrar sesión
          </Button>
        </div>

      </div>
    </header>
  )
}
