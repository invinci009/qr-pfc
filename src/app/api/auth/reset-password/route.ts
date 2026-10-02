import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'
import { resolvePfcEmail } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username or email is required' },
        { status: 400 }
      )
    }

    const resolvedEmail = resolvePfcEmail(username) || username.trim()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin ||
      'https://qr-pfc.vercel.app'
    const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: `${origin}/auth/callback?next=/dashboard?tab=settings`,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to dispatch reset link.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Password reset instructions sent to ${resolvedEmail}.`,
    })
  } catch (err: any) {
    console.error('Password reset error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to process password reset.' },
      { status: 500 }
    )
  }
}
