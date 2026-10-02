import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { businessCreateSchema } from '@/lib/validation/schemas'
import { generateRandomSlug } from '@/lib/utils/slug'
import type { Database } from '@/lib/supabase/types'

type BusinessUpdate = Database['public']['Tables']['businesses']['Update']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = businessCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid business data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const data = parsed.data

    // Check if user or system already has a business
    const { data: userBusinesses } = await admin
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)

    let existing = userBusinesses?.[0]
    if (!existing) {
      const { data: defaultBiz } = await admin
        .from('businesses')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
      existing = defaultBiz?.[0]
    }

    let businessId: string

    if (existing) {
      // Update existing without wiping unset fields
      const updateData: BusinessUpdate = {
        name: data.name,
        updated_at: new Date().toISOString(),
      }
      if (data.location !== undefined) updateData.location = data.location || null
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.secondary_phone !== undefined) updateData.secondary_phone = data.secondary_phone || null
      if (data.timezone !== undefined) updateData.timezone = data.timezone
      if (data.logo_url !== undefined) updateData.logo_url = data.logo_url || null
      if (data.primary_color !== undefined) updateData.primary_color = data.primary_color || null
      if (data.welcome_message !== undefined) updateData.welcome_message = data.welcome_message
      if (data.google_review_url !== undefined) updateData.google_review_url = data.google_review_url || null

      const { data: updated, error: updateError } = await admin
        .from('businesses')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError || !updated) {
        console.error('Update business error:', updateError)
        return NextResponse.json({ error: 'Failed to update restaurant profile' }, { status: 500 })
      }
      businessId = updated.id
    } else {
      // Create new business
      const { data: created, error: createError } = await admin
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: data.name,
          category: 'restaurant',
          location: data.location || null,
          phone: data.phone || null,
          secondary_phone: data.secondary_phone || null,
          timezone: data.timezone,
          logo_url: data.logo_url || null,
          primary_color: data.primary_color || null,
          welcome_message: data.welcome_message || {
            en: "Thanks for dining with us! We'd love to hear about your experience today.",
          },
          google_review_url: data.google_review_url || null,
        })
        .select()
        .single()

      if (createError || !created) {
        console.error('Create business error:', createError)
        return NextResponse.json({ error: 'Failed to create restaurant profile' }, { status: 500 })
      }

      businessId = created.id

      // Automatically create the initial default campaign ("Table Stand")
      const slug = generateRandomSlug(8)
      await admin.from('campaigns').insert({
        business_id: businessId,
        name: 'Table Stands',
        slug,
        active: true,
      })
    }

    return NextResponse.json({ success: true, business_id: businessId }, { status: 201 })
  } catch (error) {
    console.error('Business API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
