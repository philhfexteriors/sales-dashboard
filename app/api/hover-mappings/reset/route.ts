import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_MAPPINGS } from '@/lib/services/measurementMapper'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete all existing mappings
  const { error: deleteError } = await supabase
    .from('hover_measurement_mappings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Re-insert defaults
  const { error: insertError } = await supabase
    .from('hover_measurement_mappings')
    .insert(DEFAULT_MAPPINGS)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Return fresh data
  const { data, error: fetchError } = await supabase
    .from('hover_measurement_mappings')
    .select('*')
    .eq('active', true)
    .order('trade_group')
    .order('sort_order')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
