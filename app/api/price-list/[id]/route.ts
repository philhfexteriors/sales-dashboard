import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // If unit_price is changing, log to history
  if (body.unit_price !== undefined) {
    const { data: existing } = await supabase
      .from('price_list')
      .select('unit_price')
      .eq('id', id)
      .single()

    if (existing && Number(existing.unit_price) !== Number(body.unit_price)) {
      await supabase
        .from('price_list_history')
        .insert({
          price_list_id: id,
          old_unit_price: existing.unit_price,
          new_unit_price: body.unit_price,
          changed_by: user.id,
          reason: body.change_reason || null,
        })
    }
  }

  // Remove non-column fields before update
  const { change_reason, ...updateData } = body

  const { data, error } = await supabase
    .from('price_list')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
    .from('price_list')
    .update({ active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
