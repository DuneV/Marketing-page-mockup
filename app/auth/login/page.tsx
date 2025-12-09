"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [userType, setUserType] = useState<"employee" | "company">("employee")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const demoCredentials = {
    employee: { email: "empleado@bavaria.com", password: "password123" },
    company: { email: "empresa@bavaria.com", password: "password123" },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (email && password.length >= 6) {
        localStorage.setItem("user", JSON.stringify({ email, authenticated: true, userType, timestamp: Date.now() }))

        await new Promise((resolve) => setTimeout(resolve, 100))

        router.push("/dashboard")
      } else {
        setError("Por favor, verifica tu email y contraseña")
      }
    } catch (err) {
      setError("Error en el inicio de sesión")
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    const creds = demoCredentials[userType]
    setEmail(creds.email)
    setPassword(creds.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-amber-600 dark:text-amber-500 mb-2">Bavaria</h1>
          <p className="text-slate-600 dark:text-slate-400">Plataforma de Marketing</p>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-8 rounded-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Bienvenido</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Inicia sesión en tu cuenta</p>
          </div>

          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => setUserType("employee")}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                userType === "employee"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              Empleado
            </button>
            <button
              type="button"
              onClick={() => setUserType("company")}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                userType === "company"
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              Empresa
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-50"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-semibold h-10 rounded-lg transition-all ${
                userType === "employee" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <Button
              type="button"
              onClick={fillDemoCredentials}
              variant="outline"
              className="w-full border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-transparent"
            >
              Usar Credenciales Demo
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="#" className="text-sm text-amber-600 dark:text-amber-500 hover:text-amber-700">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </Card>

        <div className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400">
          <p>© 2025 Bavaria Marketing. Todos los derechos reservados.</p>
          <p className="mt-2 text-slate-500 dark:text-slate-500">
            Demo - Empleado: empleado@bavaria.com | Empresa: empresa@bavaria.com
          </p>
        </div>
      </div>
    </div>
  )
}
