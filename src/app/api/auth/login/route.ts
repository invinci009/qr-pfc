import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'
import { resolvePfcEmail } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      )
    }

    // Resolve owner aliases
    const resolvedEmail = resolvePfcEmail(username) || String(username).trim()

    // Prepare response object to collect cookies
    let response = NextResponse.json({ success: true })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            })
          },
        },
      }
    )

    // Sign in with 8s timeout to prevent any indefinite hanging
    const authPromise = supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: String(password),
    })

    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error('Authentication service timeout. Please try again.')), 8000)
    )

    const { data, error } = await Promise.race([authPromise, timeoutPromise])

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Invalid username or password' },
        { status: 401 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
    }

    return response
  } catch (err: any) {
    console.error('Server login error:', err)
    return NextResponse.json(
      { error: err?.message || 'Login failed. Please check your credentials.' },
      { status: 500 }
    )
  }
}
