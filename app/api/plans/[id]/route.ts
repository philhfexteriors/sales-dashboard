import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [planResult, itemsResult] = await Promise.all([
    supabase
      .from('production_plans')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('plan_line_items')
      .select('*')
      .eq('plan_id', id)
      .order('section')
      .order('sort_order'),
  ])

  if (planResult.error) return NextResponse.json({ error: planResult.error.message }, { status: 500 })

  return NextResponse.json({
    plan: planResult.data,
    lineItems: itemsResult.data || [],
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const { plan: planUpdates, lineItems } = body

  // Update plan fields if provided
  if (planUpdates) {
    // If the plan is being signed, capture audit trail info server-side
    if (planUpdates.status === 'signed') {
      const headersList = await headers()
      const forwardedFor = headersList.get('x-forwarded-for')
      const realIp = headersList.get('x-real-ip')
      const userAgent = headersList.get('user-agent')

      planUpdates.signed_ip = forwardedFor?.split(',')[0]?.trim() || realIp || null
      planUpdates.signed_user_agent = userAgent || null
    }

    const { error } = await supabase
      .from('production_plans')
      .update(planUpdates)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Upsert line items if provided
  if (lineItems && Array.isArray(lineItems)) {
    // Get existing item IDs
    const { data: existing } = await supabase
      .from('plan_line_items')
      .select('id')
      .eq('plan_id', id)

    const existingIds = new Set((existing || []).map(e => e.id))
    const incomingIds = new Set(lineItems.filter((li: { id?: string }) => li.id).map((li: { id: string }) => li.id))

    // Delete removed items
    const toDelete = [...existingIds].filter(eid => !incomingIds.has(eid))
    if (toDelete.length > 0) {
      await supabase
        .from('plan_line_items')
        .delete()
        .in('id', toDelete)
    }

    // Upsert all items
    for (const item of lineItems) {
      if (item.id && existingIds.has(item.id)) {
        // Update existing
        const { id: itemId, ...updates } = item
        await supabase
          .from('plan_line_items')
          .update(updates)
          .eq('id', itemId)
      } else {
        // Insert new
        const { id: _tempId, ...insertData } = item
        await supabase
          .from('plan_line_items')
          .insert({ ...insertData, plan_id: id })
      }
    }
  }

  // Fetch and return updated plan
  const { data } = await supabase
    .from('production_plans')
    .select('*')
    .eq('id', id)
    .single()

  return NextResponse.json(data)
}
