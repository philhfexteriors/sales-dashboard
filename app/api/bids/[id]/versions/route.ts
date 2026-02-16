import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('bid_versions')
    .select('*')
    .eq('bid_id', id)
    .order('version_number', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Get current version
  const { data: currentVersion } = await supabase
    .from('bid_versions')
    .select('*')
    .eq('bid_id', id)
    .neq('status', 'superseded')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  if (!currentVersion) {
    return NextResponse.json({ error: 'No current version found' }, { status: 404 })
  }

  // Mark current version as superseded
  await supabase
    .from('bid_versions')
    .update({ status: 'superseded' })
    .eq('id', currentVersion.id)

  // Create new version
  const { data: newVersion, error: versionError } = await supabase
    .from('bid_versions')
    .insert({
      bid_id: id,
      version_number: currentVersion.version_number + 1,
      default_margin_pct: currentVersion.default_margin_pct,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 })

  // Clone line items from current version to new version
  const { data: currentItems } = await supabase
    .from('bid_line_items')
    .select('*')
    .eq('version_id', currentVersion.id)
    .order('sort_order')

  if (currentItems && currentItems.length > 0) {
    const clonedItems = currentItems.map(item => {
      const { id: _oldId, version_id: _oldVersionId, created_at: _ca, updated_at: _ua, ...rest } = item
      return { ...rest, bid_id: id, version_id: newVersion.id }
    })

    await supabase.from('bid_line_items').insert(clonedItems)
  }

  return NextResponse.json(newVersion)
}
