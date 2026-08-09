import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = request.cookies.get("user-role")?.value

  // Si no es admin e intenta entrar a /admin → redirigir a /dashboard
  if (pathname.startsWith("/admin") && role && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}