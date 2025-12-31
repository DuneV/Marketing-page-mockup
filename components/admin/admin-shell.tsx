"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`block px-3 py-2 rounded ${
          active ? "bg-slate-200 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-900"
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 p-4">
        <div className="font-bold mb-4">Admin</div>
        <nav className="space-y-1">
          <Item href="/admin/dashboard" label="Dashboard" />
          <Item href="/admin/campaigns" label="Campañas" />
          {/* agrega más items */}
        </nav>
      </aside>

      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
