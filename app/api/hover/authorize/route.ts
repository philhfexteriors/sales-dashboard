import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.HOVER_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Hover not configured' }, { status: 503 })
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/hover/callback`

  const authUrl = new URL('https://hover.to/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(authUrl.toString())
}
