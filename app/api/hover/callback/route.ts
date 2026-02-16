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
    console.error('[hover/callback] No code parameter received')
    return NextResponse.redirect(new URL('/bids?error=no_code', request.nextUrl.origin))
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/hover/callback`

  console.log('[hover/callback] Exchanging code for tokens...')
  const tokens = await exchangeHoverCode(code, redirectUri)
  if (!tokens) {
    console.error('[hover/callback] Token exchange failed')
    return NextResponse.redirect(new URL('/bids?error=token_exchange_failed', request.nextUrl.origin))
  }

  console.log('[hover/callback] Token exchange success, expires_in:', tokens.expires_in)

  // Store tokens using admin client (org-wide, bypasses RLS)
  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (err) {
    console.error('[hover/callback] Admin client error:', err)
    return NextResponse.redirect(new URL('/bids?error=admin_client_failed', request.nextUrl.origin))
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Upsert — if tokens already exist, update them
  const { data: existing, error: selectErr } = await admin
    .from('hover_tokens')
    .select('id')
    .limit(1)
    .single()

  if (selectErr) {
    console.log('[hover/callback] No existing tokens (or table issue):', selectErr.message)
  }

  if (existing) {
    const { error: updateErr } = await admin
      .from('hover_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateErr) {
      console.error('[hover/callback] Token update failed:', updateErr.message)
      return NextResponse.redirect(new URL('/bids?error=token_store_failed', request.nextUrl.origin))
    }
    console.log('[hover/callback] Tokens updated successfully')
  } else {
    const { error: insertErr } = await admin
      .from('hover_tokens')
      .insert({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })

    if (insertErr) {
      console.error('[hover/callback] Token insert failed:', insertErr.message)
      return NextResponse.redirect(new URL('/bids?error=token_store_failed', request.nextUrl.origin))
    }
    console.log('[hover/callback] Tokens inserted successfully')
  }

  // Redirect back to where the user came from (bid edit page)
  const returnTo = request.nextUrl.searchParams.get('state') || '/bids'
  const redirectUrl = new URL(returnTo, request.nextUrl.origin)
  redirectUrl.searchParams.set('hover', 'connected')
  return NextResponse.redirect(redirectUrl)
}
