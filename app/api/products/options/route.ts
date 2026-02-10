import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')
  const parentId = searchParams.get('parent_id')
  const activeOnly = searchParams.get('active') === 'true'
  const all = searchParams.get('all') === 'true'

  let query = supabase
    .from('product_options')
    .select('*')
    .order('sort_order')
    .order('name')

  if (activeOnly) query = query.eq('active', true)
  if (categoryId) query = query.eq('category_id', categoryId)

  // all=true returns every option in the category (for admin tree view)
  // Otherwise, filter by parent_id for cascading dropdowns
  if (!all) {
    if (parentId) {
      query = query.eq('parent_id', parentId)
    } else if (categoryId && !parentId) {
      query = query.is('parent_id', null)
    }
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { category_id, parent_id, level, name, notes, sort_order } = body

  const { data, error } = await supabase
    .from('product_options')
    .insert({
      category_id,
      parent_id: parent_id || null,
      level: level || 0,
      name,
      notes: notes || null,
      sort_order: sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
