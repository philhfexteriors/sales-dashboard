import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const zip = request.nextUrl.searchParams.get('zip')

  let query = supabase
    .from('tax_rates')
    .select('*')
    .order('zip_code', { ascending: true })

  if (zip) {
    query = query.eq('zip_code', zip)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { zip_code, state, county, rate, description } = body

  if (!zip_code || rate == null) {
    return NextResponse.json({ error: 'zip_code and rate are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tax_rates')
    .upsert({
      zip_code,
      state,
      county,
      rate,
      description,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'zip_code' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
