import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('hover_measurement_mappings')
    .select('*')
    .eq('active', true)
    .order('trade_group')
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { mappings } = body

  if (!Array.isArray(mappings)) {
    return NextResponse.json({ error: 'mappings array is required' }, { status: 400 })
  }

  // Upsert each mapping by target_field
  const errors: string[] = []
  for (const mapping of mappings) {
    const { error } = await supabase
      .from('hover_measurement_mappings')
      .update({
        mapping_type: mapping.mapping_type,
        hover_json_paths: mapping.hover_json_paths || null,
        computation_id: mapping.computation_id || null,
        derived_formula: mapping.derived_formula || null,
        default_value: mapping.default_value ?? 0,
        hover_source_category: mapping.hover_source_category || 'none',
        hover_source_description: mapping.hover_source_description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mapping.id)

    if (error) errors.push(`${mapping.target_field}: ${error.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  // Return updated mappings
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
