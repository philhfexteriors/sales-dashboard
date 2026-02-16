import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trade = request.nextUrl.searchParams.get('trade')
  const activeOnly = request.nextUrl.searchParams.get('active') !== 'false'

  let query = supabase
    .from('bid_templates')
    .select(`
      *,
      bid_template_items (
        *,
        price_list (id, description, unit, unit_price)
      )
    `)
    .order('trade')
    .order('sort_order')

  if (trade) query = query.eq('trade', trade)
  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { trade, name, description, items } = body

  // Create template
  const { data: template, error: templateError } = await supabase
    .from('bid_templates')
    .insert({ trade, name, description: description || null })
    .select()
    .single()

  if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 })

  // Create template items if provided
  if (items && items.length > 0) {
    const templateItems = items.map((item: Record<string, unknown>, index: number) => ({
      template_id: template.id,
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

  // Return template with items
  const { data: result } = await supabase
    .from('bid_templates')
    .select(`*, bid_template_items (*, price_list (id, description, unit, unit_price))`)
    .eq('id', template.id)
    .single()

  return NextResponse.json(result)
}
