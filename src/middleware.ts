import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { botFilterMiddleware } from '@/lib/middleware/bot-filter'
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bot filter for customer routes (cheapest check first)
  if (pathname.startsWith('/r/') || pathname.startsWith('/api/public/')) {
    const botResponse = botFilterMiddleware(request)
    if (botResponse) return botResponse
  }

  // 2. Rate limiting for public API routes
  if (pathname.startsWith('/api/public/')) {
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse) return rateLimitResponse
  }

  // 3. Supabase auth session refresh for dashboard routes
  const response = NextResponse.next({ request: { headers: request.headers } })

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
      try {
        const supabase = createServerClient(
          supabaseUrl,
          supabaseAnonKey,
          {
            cookies: {
              getAll: () => request.cookies.getAll(),
              setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value, options }) =>
                  response.cookies.set(name, value, options)
                )
              },
            },
          }
        )

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user && !pathname.startsWith('/login')) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
      } catch {
        // Fall back to redirect if auth error occurs
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/r/:path*',
    '/api/public/:path*',
    '/dashboard/:path*',
    '/api/dashboard/:path*',
  ],
}
