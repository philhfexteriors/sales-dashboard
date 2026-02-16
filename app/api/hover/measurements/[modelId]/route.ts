import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHoverAccessToken, HOVER_API_BASE } from '@/lib/services/hoverApi'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { modelId } = await params
  if (!modelId) {
    return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
  }

  const token = await getHoverAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'Hover not connected' }, { status: 503 })
  }

  try {
    const url = `${HOVER_API_BASE}/models/${modelId}/artifacts/measurements.json?version=full_json`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      console.error('Hover measurements fetch failed:', res.status, await res.text())
      return NextResponse.json({ error: 'Failed to fetch measurements' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Hover measurements error:', err)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
