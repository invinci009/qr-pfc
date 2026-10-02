import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { resolvePfcEmail } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { username, currentPassword, newPassword } = body

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    if (currentPassword && currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Determine target account email
    let targetEmail: string | null = null

    // 1. Resolve alias or custom username if provided
    if (username && typeof username === 'string') {
      targetEmail = resolvePfcEmail(username)
    }

    // 2. Check active authenticated session if no explicit username provided
    const serverSupabase = await createClient()
    const {
      data: { user: sessionUser },
    } = await serverSupabase.auth.getUser()

    if (!targetEmail && sessionUser?.email) {
      targetEmail = sessionUser.email
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Username or email is required to identify the account.' },
        { status: 400 }
      )
    }

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Current password is required to verify identity.' },
        { status: 400 }
      )
    }

    // 3. Verify current password by signing in
    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully!',
    })

    const verifyClient = createServerClient<Database>(
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

    const { data: signInData, error: signInError } = await verifyClient.auth.signInWithPassword({
      email: targetEmail,
      password: String(currentPassword),
    })

    if (signInError || !signInData.user) {
      return NextResponse.json(
        {
          error:
            'Current password is incorrect. Please verify your credentials and try again.',
        },
        { status: 401 }
      )
    }

    // 4. Update the password using admin client for authoritative update
    const { error: updateError } = await admin.auth.admin.updateUserById(
      signInData.user.id,
      {
        password: newPassword,
      }
    )

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password.' },
        { status: 500 }
      )
    }

    // 5. Establish fresh authenticated session with new password so the caller stays logged in
    try {
      await verifyClient.auth.signInWithPassword({
        email: targetEmail,
        password: newPassword,
      })
    } catch (sessionErr) {
      console.warn('Could not re-establish session automatically:', sessionErr)
    }

    return response
  } catch (err: any) {
    console.error('Password change error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server error while updating password.' },
      { status: 500 }
    )
  }
}
