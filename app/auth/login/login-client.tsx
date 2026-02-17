// --- FILE: app/auth/login/login-client.tsx ---
"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Zap, ArrowRight } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import LOGO from "@/public/logo.png"

export function LoginClientPage() {
  const router = useRouter()
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace("/app/redirect")
    } catch (err: any) {
      const code = err?.code ?? ""
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Credenciales incorrectas")
      } else if (code === "auth/user-not-found") {
        setError("Usuario no existe")
      } else if (code.includes("cors") || code.includes("firestore")) {
        setError("Error de conexión. Intenta nuevamente.")
      } else {
        setError("Error en el inicio de sesión")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      <div className="relative mx-auto w-full max-w-md pt-10 sm:pt-14">
        <div className="text-center mb-8 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="relative h-20 w-20 group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500" />
            <div className="relative h-full w-full animate-in zoom-in duration-700">
              <Image src={LOGO} alt="MARATHON" fill className="object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110" priority />
            </div>
          </div>
          <div className="animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
            <h1 className="text-5xl font-bold italic">MARATHON</h1>
            <p className="text-muted-foreground mt-1 flex items-center justify-center gap-2">
              <Zap className="h-3 w-3 text-primary animate-pulse" />
              Plataforma de Marketing
              <Zap className="h-3 w-3 text-primary animate-pulse" />
            </p>
          </div>
        </div>
        <Card className="border border-border bg-card/50 backdrop-blur-xl text-card-foreground shadow-2xl p-8 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 hover:shadow-primary/5 transition-shadow">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Iniciar sesión</h2>
            <p className="text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5 animate-pulse" />
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
              <div className="relative group">
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} className="bg-background text-foreground border-border h-11 transition-all duration-300 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10" required />
                {emailFocused && <div className="absolute inset-0 -z-10 bg-primary/5 rounded-lg blur-sm animate-in fade-in duration-200" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Contraseña</Label>
              <div className="relative group">
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} className="bg-background text-foreground border-border h-11 transition-all duration-300 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10" required />
                {passwordFocused && <div className="absolute inset-0 -z-10 bg-primary/5 rounded-lg blur-sm animate-in fade-in duration-200" />}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Iniciando sesión...</>
                ) : (
                  <>Entrar<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                )}
              </span>
            </Button>
          </form>
        </Card>
        <div className="mt-8 text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-300">
          <p>© {currentYear} MARATHON. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}