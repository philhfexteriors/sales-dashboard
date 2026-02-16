import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Whitelist allowed fields
  const { name, section, field_type, config, sort_order, active } = body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (section !== undefined) updates.section = section
  if (field_type !== undefined) updates.field_type = field_type
  if (config !== undefined) updates.config = config
  if (sort_order !== undefined) updates.sort_order = sort_order
  if (active !== undefined) updates.active = active

  const { data, error } = await supabase
    .from('product_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Delete all product_options under this category first
  await supabase
    .from('product_options')
    .delete()
    .eq('category_id', id)

  const { error } = await supabase
    .from('product_categories')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
