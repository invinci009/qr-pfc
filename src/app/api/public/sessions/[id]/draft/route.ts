import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionFromCookie } from '@/lib/session/cookie'
import { buildFactSheet } from '@/lib/draft/fact-sheet'
import { generateReviewDraft } from '@/lib/draft/generator'
import { logEvent } from '@/lib/observability/logger'
import { z } from 'zod'

interface RouteProps {
  params: Promise<{ id: string }>
}

const patchDraftSchema = z.object({
  final_text: z.string().min(1).max(2000),
})

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const startTime = Date.now()
  try {
    const resolvedParams = await params
    let id = resolvedParams?.id
    if (!id || id === 'undefined') {
      const match = request.url.match(/\/sessions\/([^\/\?]+)/)
      if (match) id = match[1]
    }

    const supabase = createAdminClient()

    // 1. Fetch session and business info
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, business_id, status, businesses(name)')
      .eq('id', id)
      .maybeSingle()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // 2. Validate cookie or database existence
    const cookie = await getSessionFromCookie()
    if (cookie && cookie.session_id !== id) {
      console.warn(`[Draft] Cookie mismatch for session ${id}`)
    }

    // 3. Idempotency: Return existing draft if already generated
    const { data: existingDraft } = await supabase
      .from('review_drafts')
      .select('original_text, final_text, method')
      .eq('session_id', id)
      .maybeSingle()

    if (existingDraft && existingDraft.original_text) {
      return NextResponse.json(existingDraft, { status: 200 })
    }

    // 4. Retrieve answers and menu items to build Fact Sheet
    const { data: answers } = await supabase
      .from('answers')
      .select('question_key, value')
      .eq('session_id', id)

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name')
      .eq('business_id', session.business_id)

    const menuItemNames: Record<string, string> = {}
    if (menuItems) {
      for (const item of menuItems) {
        const name = typeof item.name === 'string' ? item.name : (item.name as any)?.en || 'Specialty dish'
        menuItemNames[item.id] = name
      }
    }

    const factSheet = buildFactSheet(answers || [], menuItemNames)
    const restaurantName = (session.businesses as any)?.name || 'Patna Fried Chicken (PFC)'

    // 5. Generate review draft
    const generated = await generateReviewDraft(factSheet, id, restaurantName)

    // 6. Upsert into review_drafts
    const { data: newDraft, error: insertError } = await supabase
      .from('review_drafts')
      .upsert(
        {
          session_id: id,
          original_text: generated.text,
          final_text: generated.text,
          method: generated.method,
        },
        { onConflict: 'session_id' }
      )
      .select('original_text, final_text, method')
      .maybeSingle()

    if (insertError) {
      console.error('Draft upsert error:', insertError)
      return NextResponse.json({ error: 'Failed to record review draft' }, { status: 500 })
    }

    // 7. Fire DRAFT_GENERATED event
    await supabase.from('events').insert({
      session_id: id,
      business_id: session.business_id,
      event_type: 'DRAFT_GENERATED',
      metadata: { method: generated.method },
    })

    logEvent({
      sessionId: id,
      businessId: session.business_id,
      action: 'DRAFT_GENERATED',
      latencyMs: Date.now() - startTime,
      metadata: { method: generated.method, length: generated.text.length },
    })

    return NextResponse.json(newDraft || { original_text: generated.text, final_text: generated.text, method: generated.method }, { status: 200 })
  } catch (error) {
    console.error('Draft API error:', error)
    logEvent({
      level: 'error',
      action: 'DRAFT_GENERATION_FAILED',
      latencyMs: Date.now() - startTime,
      metadata: { error: String(error) },
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = patchDraftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid draft update payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { final_text } = parsed.data
    const supabase = createAdminClient()

    // Update final_text
    const { data: updated, error } = await supabase
      .from('review_drafts')
      .update({
        final_text,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', id)
      .select('final_text')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update review draft' }, { status: 500 })
    }

    return NextResponse.json({ success: true, final_text: updated?.final_text || final_text }, { status: 200 })
  } catch (error) {
    console.error('Draft update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
