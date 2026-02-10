import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section')
  const activeOnly = searchParams.get('active') === 'true'

  let query = supabase
    .from('product_categories')
    .select('*')
    .order('section')
    .order('sort_order')

  if (section) query = query.eq('section', section)
  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { section, name, sort_order, field_key, field_type, cascade_levels, level_labels, allow_custom, allow_deselect, config } = body

  const { data, error } = await supabase
    .from('product_categories')
    .insert({
      section,
      name,
      sort_order: sort_order || 0,
      field_key: field_key || null,
      field_type: field_type || 'select',
      cascade_levels: cascade_levels || 1,
      level_labels: level_labels || null,
      allow_custom: allow_custom || false,
      allow_deselect: allow_deselect || false,
      config: config || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
