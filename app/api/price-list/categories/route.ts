import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const trade = request.nextUrl.searchParams.get('trade')
  const activeOnly = request.nextUrl.searchParams.get('active') !== 'false'

  let query = supabase
    .from('price_list_categories')
    .select('*')
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
  const { trade, name, description, sort_order } = body

  if (!trade || !name) {
    return NextResponse.json({ error: 'trade and name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('price_list_categories')
    .insert({
      trade,
      name,
      description: description || null,
      sort_order: sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
