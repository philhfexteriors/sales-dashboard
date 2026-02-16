import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { convertBidToPlan } from '@/lib/services/bidToPlanConverter'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify bid exists
  const { data: bid } = await supabase
    .from('bids')
    .select('id, status, production_plan_id')
    .eq('id', id)
    .single()

  if (!bid) {
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }

  // Check if already converted
  if (bid.production_plan_id) {
    return NextResponse.json({
      planId: bid.production_plan_id,
      message: 'Bid already converted to a production plan',
    })
  }

  const result = await convertBidToPlan(id, supabase)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ planId: result.planId })
}
