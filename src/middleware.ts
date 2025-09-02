import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const pathname = request.nextUrl.pathname
  
  // Check if this is a tracking domain request
  if (host && !host.includes('localhost') && !host.includes('vercel.app')) {
    // This is a custom tracking domain request
    console.log('Custom tracking domain request:', host, pathname)
    
    // Handle tracking endpoints
    if (pathname.startsWith('/api/track/')) {
      // Allow tracking endpoints to work from any domain
      return NextResponse.next()
    }
    
    // Redirect root and other paths to main app
    if (pathname === '/' || !pathname.startsWith('/api/')) {
      return NextResponse.redirect('https://loumassbeta.vercel.app')
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}