import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trade = request.nextUrl.searchParams.get('trade')
  const section = request.nextUrl.searchParams.get('section')
  const activeOnly = request.nextUrl.searchParams.get('active') !== 'false'

  let query = supabase
    .from('price_list')
    .select('*')
    .order('trade')
    .order('section')
    .order('sort_order')

  if (trade) query = query.eq('trade', trade)
  if (section) query = query.eq('section', section)
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
  const { trade, section, item_code, description, unit, unit_price, is_taxable, sort_order, notes } = body

  const { data, error } = await supabase
    .from('price_list')
    .insert({
      trade,
      section,
      item_code,
      description,
      unit,
      unit_price: unit_price || 0,
      is_taxable: is_taxable || false,
      sort_order: sort_order || 0,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
