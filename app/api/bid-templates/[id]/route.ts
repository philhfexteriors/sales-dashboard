import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('bid_templates')
    .select(`
      *,
      bid_template_items (
        *,
        price_list (id, description, unit, unit_price, is_taxable)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, description, active, items } = body

  // Update template fields
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (active !== undefined) updateData.active = active
  if (body.waste_pct !== undefined) updateData.waste_pct = body.waste_pct

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('bid_templates')
      .update(updateData)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Upsert items if provided (preserves UUIDs for depends_on_item_id references)
  if (items !== undefined) {
    // Get existing item IDs
    const { data: existingItems } = await supabase
      .from('bid_template_items')
      .select('id')
      .eq('template_id', id)

    const existingIds = new Set((existingItems || []).map((i: { id: string }) => i.id))
    const incomingIds = new Set<string>()

    const toInsert: Record<string, unknown>[] = []
    const toUpdate: { id: string; data: Record<string, unknown> }[] = []

    for (let index = 0; index < items.length; index++) {
      const item = items[index] as Record<string, unknown>
      const itemData = {
        template_id: id,
        price_list_id: item.price_list_id || null,
        section: item.section,
        description: item.description,
        unit: item.unit,
        default_qty_formula: item.default_qty_formula || null,
        default_qty: item.default_qty || null,
        sort_order: item.sort_order ?? index,
        is_required: item.is_required ?? true,
        measurement_key: item.measurement_key || null,
        depends_on_item_id: item.depends_on_item_id || null,
        notes: item.notes || null,
      }

      if (item.id && existingIds.has(item.id as string)) {
        // Update existing item
        incomingIds.add(item.id as string)
        toUpdate.push({ id: item.id as string, data: itemData })
      } else {
        // Insert new item
        toInsert.push(itemData)
      }
    }

    // Delete items not in incoming list
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await supabase
        .from('bid_template_items')
        .delete()
        .in('id', toDelete)
    }

    // Update existing items
    for (const { id: itemId, data } of toUpdate) {
      await supabase
        .from('bid_template_items')
        .update(data)
        .eq('id', itemId)
    }

    // Insert new items
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('bid_template_items')
        .insert(toInsert)

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  // Return updated template with items
  const { data: result } = await supabase
    .from('bid_templates')
    .select(`*, bid_template_items (*, price_list (id, description, unit, unit_price, is_taxable))`)
    .eq('id', id)
    .single()

  return NextResponse.json(result)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Soft delete
  const { error } = await supabase
    .from('bid_templates')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
