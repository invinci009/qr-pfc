import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard?tab=settings'
  const errorDescription = searchParams.get('error_description') || searchParams.get('error')

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    request.nextUrl.origin ||
    'https://qr-pfc.vercel.app'

  // If Supabase passed an error directly (e.g. otp_expired)
  if (errorDescription) {
    console.error('Supabase auth callback received error:', errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`)
  }

  const supabase = await createClient()

  // 1. Handle Token Hash (standard email recovery / magic link format)
  if (token_hash && type) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('Supabase verifyOtp error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    } catch (err: any) {
      console.error('Unexpected error in verifyOtp callback:', err)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(err?.message || 'Verification failed')}`
      )
    }
  }

  // 2. Handle PKCE Code Exchange
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('Supabase exchangeCodeForSession error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    } catch (err: any) {
      console.error('Unexpected error in auth callback exchange:', err)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(err?.message || 'Code exchange failed')}`
      )
    }
  }

  // If code exchange failed or no code was provided, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
