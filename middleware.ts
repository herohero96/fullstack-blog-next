import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/create', '/edit', '/admin']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!requiresAuth) return NextResponse.next()

  const token = request.cookies.get('token')?.value
  if (token) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/create/:path*', '/edit/:path*', '/admin/:path*'],
}
