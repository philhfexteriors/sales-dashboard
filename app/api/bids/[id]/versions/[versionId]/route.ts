import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch version
  const { data: version, error: vErr } = await supabase
    .from('bid_versions')
    .select('*')
    .eq('id', versionId)
    .eq('bid_id', id)
    .single()

  if (vErr || !version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  // Fetch line items for this version
  const { data: lineItems } = await supabase
    .from('bid_line_items')
    .select('*')
    .eq('version_id', versionId)
    .order('section')
    .order('sort_order')

  return NextResponse.json({ version, lineItems: lineItems || [] })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.status !== undefined) updates.status = body.status

  const { data, error } = await supabase
    .from('bid_versions')
    .update(updates)
    .eq('id', versionId)
    .eq('bid_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
