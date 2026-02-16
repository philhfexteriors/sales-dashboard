import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHoverAccessToken, HOVER_API_BASE } from '@/lib/services/hoverApi'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const search = request.nextUrl.searchParams.get('search') || ''
  if (search.length < 3) {
    return NextResponse.json({ results: [], pagination: { current_page: 1, next_page: null } })
  }

  const token = await getHoverAccessToken()
  if (!token) {
    console.error('[hover/jobs] No valid token — getHoverAccessToken returned null')
    return NextResponse.json({ error: 'Hover not connected' }, { status: 503 })
  }

  try {
    const url = new URL(`${HOVER_API_BASE}/jobs`)
    url.searchParams.set('search', search)
    url.searchParams.set('state', 'complete')
    url.searchParams.set('page', request.nextUrl.searchParams.get('page') || '1')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      console.error('Hover jobs search failed:', res.status, await res.text())
      return NextResponse.json({ error: 'Hover search failed' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('Hover jobs search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
