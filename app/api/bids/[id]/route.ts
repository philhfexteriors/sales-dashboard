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

  // Get bid
  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .select('*')
    .eq('id', id)
    .single()

  if (bidError) return NextResponse.json({ error: bidError.message }, { status: 500 })

  // Get current (latest non-superseded) version
  const { data: version } = await supabase
    .from('bid_versions')
    .select('*')
    .eq('bid_id', id)
    .neq('status', 'superseded')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Get line items for current version
  let lineItems: unknown[] = []
  if (version) {
    const { data: items } = await supabase
      .from('bid_line_items')
      .select('*')
      .eq('version_id', version.id)
      .order('section')
      .order('sort_order')

    lineItems = items || []
  }

  return NextResponse.json({
    bid: { ...bid, current_version_id: version?.id },
    version,
    lineItems,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { bid: bidUpdates, lineItems } = body

  // Update bid fields
  if (bidUpdates) {
    // Remove non-column fields
    const { current_version_id, id: _id, ...updateData } = bidUpdates
    const { error } = await supabase
      .from('bids')
      .update(updateData)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update line items for current version
  if (lineItems && Array.isArray(lineItems)) {
    // Get current version
    const { data: version } = await supabase
      .from('bid_versions')
      .select('id')
      .eq('bid_id', id)
      .neq('status', 'superseded')
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (version) {
      // Get existing item IDs
      const { data: existing } = await supabase
        .from('bid_line_items')
        .select('id')
        .eq('version_id', version.id)

      const existingIds = new Set((existing || []).map(e => e.id))
      const incomingIds = new Set(
        lineItems.filter((li: { id?: string }) => li.id).map((li: { id: string }) => li.id)
      )

      // Delete removed items
      const toDelete = [...existingIds].filter(eid => !incomingIds.has(eid))
      if (toDelete.length > 0) {
        await supabase
          .from('bid_line_items')
          .delete()
          .in('id', toDelete)
      }

      // Upsert items
      for (const item of lineItems) {
        if (item.id && existingIds.has(item.id)) {
          const { id: itemId, ...updates } = item
          await supabase
            .from('bid_line_items')
            .update(updates)
            .eq('id', itemId)
        } else {
          const { id: _tempId, ...insertData } = item
          await supabase
            .from('bid_line_items')
            .insert({
              ...insertData,
              bid_id: id,
              version_id: version.id,
            })
        }
      }

      // Update version totals
      await supabase
        .from('bid_versions')
        .update({
          materials_total: bidUpdates?.materials_total || 0,
          labor_total: bidUpdates?.labor_total || 0,
          tax_total: bidUpdates?.tax_total || 0,
          grand_total: bidUpdates?.grand_total || 0,
          margin_total: bidUpdates?.margin_total || 0,
        })
        .eq('id', version.id)
    }
  }

  return NextResponse.json({ success: true })
}
