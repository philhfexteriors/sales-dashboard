import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const priceListId = request.nextUrl.searchParams.get('price_list_id')
  const activeOnly = request.nextUrl.searchParams.get('active') !== 'false'

  let query = supabase
    .from('price_list_variants')
    .select('*')
    .order('sort_order')

  if (priceListId) query = query.eq('price_list_id', priceListId)
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
  const { price_list_id, name, variant_group, sort_order } = body

  if (!price_list_id || !name) {
    return NextResponse.json({ error: 'price_list_id and name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('price_list_variants')
    .insert({
      price_list_id,
      name,
      variant_group: variant_group || 'color',
      sort_order: sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
