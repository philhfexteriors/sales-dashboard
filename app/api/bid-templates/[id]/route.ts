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
        price_list (id, description, unit, unit_price)
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

  // Update template
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (active !== undefined) updateData.active = active

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('bid_templates')
      .update(updateData)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Replace items if provided
  if (items !== undefined) {
    // Delete existing items
    await supabase
      .from('bid_template_items')
      .delete()
      .eq('template_id', id)

    // Insert new items
    if (items.length > 0) {
      const templateItems = items.map((item: Record<string, unknown>, index: number) => ({
        template_id: id,
        price_list_id: item.price_list_id || null,
        section: item.section,
        description: item.description,
        unit: item.unit,
        default_qty_formula: item.default_qty_formula || null,
        default_qty: item.default_qty || null,
        sort_order: item.sort_order ?? index,
        is_required: item.is_required ?? true,
        notes: item.notes || null,
      }))

      const { error: itemsError } = await supabase
        .from('bid_template_items')
        .insert(templateItems)

      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // Return updated template with items
  const { data: result } = await supabase
    .from('bid_templates')
    .select(`*, bid_template_items (*, price_list (id, description, unit, unit_price))`)
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
