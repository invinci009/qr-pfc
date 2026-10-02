import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const addDishSchema = z.object({
  name: z.string().min(1).max(100),
})

const patchDishSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
})

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    let businessId = searchParams.get('business_id')

    if (!businessId) {
      const { data: defaultBiz } = await admin
        .from('businesses')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (defaultBiz) {
        businessId = defaultBiz.id
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: menuItems, error } = await admin
      .from('menu_items')
      .select('id, business_id, name, active, position')
      .eq('business_id', businessId)
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
    }

    return NextResponse.json({ menu_items: menuItems }, { status: 200 })
  } catch (error) {
    console.error('Fetch menu items error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    let businessId: string | null = null
    const { data: userBusinesses } = await admin
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (userBusinesses && userBusinesses.length > 0) {
      businessId = userBusinesses[0].id
    } else {
      const { data: defaultBiz } = await admin
        .from('businesses')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
      if (defaultBiz && defaultBiz.length > 0) {
        businessId = defaultBiz[0].id
      }
    }

    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const parsed = addDishSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid dish name' }, { status: 400 })

    const { name } = parsed.data

    const { data: dish, error } = await admin
      .from('menu_items')
      .insert({
        business_id: businessId,
        name: { en: name },
        active: true,
        position: 1,
      })
      .select()
      .single()

    if (error || !dish) {
      return NextResponse.json({ error: 'Failed to add dish' }, { status: 500 })
    }

    return NextResponse.json(dish, { status: 201 })
  } catch (error) {
    console.error('Add menu item error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const parsed = patchDishSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const { id, active } = parsed.data
    const admin = createAdminClient()

    const { data: dish, error } = await admin
      .from('menu_items')
      .update({ active })
      .eq('id', id)
      .select()
      .single()

    if (error || !dish) {
      return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 })
    }

    return NextResponse.json(dish, { status: 200 })
  } catch (error) {
    console.error('Update menu item error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Missing dish id' }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { error } = await admin.from('menu_items').delete().eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Delete menu item error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
