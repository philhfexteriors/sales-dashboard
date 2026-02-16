import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('bids')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const limit = request.nextUrl.searchParams.get('limit')

  if (limit) {
    query = query.limit(Number(limit))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with latest version number
  if (data && data.length > 0) {
    const bidIds = data.map((b: { id: string }) => b.id)
    const { data: versions } = await supabase
      .from('bid_versions')
      .select('bid_id, version_number')
      .in('bid_id', bidIds)
      .order('version_number', { ascending: false })

    const latestVersionMap = new Map<string, number>()
    for (const v of versions || []) {
      if (!latestVersionMap.has(v.bid_id)) {
        latestVersionMap.set(v.bid_id, v.version_number)
      }
    }

    const enriched = data.map((bid: { id: string }) => ({
      ...bid,
      version_number: latestVersionMap.get(bid.id) || 1,
    }))
    return NextResponse.json(enriched)
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Create bid
  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .insert({
      created_by: user.id,
      trade: body.trade || 'siding',
      template_id: body.template_id || null,
      default_margin_pct: body.default_margin_pct || 30,
      waste_pct_roof: body.waste_pct_roof || 10,
      waste_pct_siding: body.waste_pct_siding || 30,
      waste_pct_fascia: body.waste_pct_fascia || 15,
      tax_rate: body.tax_rate || 0,
      client_name: body.client_name || null,
      client_address: body.client_address || null,
      cc_account_id: body.cc_account_id || null,
    })
    .select()
    .single()

  if (bidError) return NextResponse.json({ error: bidError.message }, { status: 500 })

  // Create first version
  const { data: version, error: versionError } = await supabase
    .from('bid_versions')
    .insert({
      bid_id: bid.id,
      version_number: 1,
      default_margin_pct: bid.default_margin_pct,
    })
    .select()
    .single()

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 })

  return NextResponse.json({ bid, version })
}
