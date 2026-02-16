import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { exchangeHoverCode } from '@/lib/services/hoverApi'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin))
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/bids?error=no_code', request.nextUrl.origin))
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/hover/callback`

  const tokens = await exchangeHoverCode(code, redirectUri)
  if (!tokens) {
    return NextResponse.redirect(new URL('/bids?error=token_exchange_failed', request.nextUrl.origin))
  }

  // Store tokens using admin client (org-wide, bypasses RLS)
  const admin = getSupabaseAdmin()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Upsert — if tokens already exist, update them
  const { data: existing } = await admin
    .from('hover_tokens')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await admin
      .from('hover_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await admin
      .from('hover_tokens')
      .insert({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
  }

  return NextResponse.redirect(new URL('/bids?hover=connected', request.nextUrl.origin))
}
