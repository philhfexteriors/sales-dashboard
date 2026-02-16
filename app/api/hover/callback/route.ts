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
  const error = request.nextUrl.searchParams.get('error')

  // Determine return URL from state parameter
  const returnTo = request.nextUrl.searchParams.get('state') || '/bids'

  function redirectWithError(msg: string) {
    const url = new URL(returnTo, request.nextUrl.origin)
    url.searchParams.set('hover_error', encodeURIComponent(msg))
    return NextResponse.redirect(url)
  }

  if (error) {
    return redirectWithError(error)
  }

  if (!code) {
    return redirectWithError('no_code')
  }

  try {
    const origin = request.nextUrl.origin
    const redirectUri = `${origin}/api/hover/callback`

    const tokens = await exchangeHoverCode(code, redirectUri)
    if (!tokens) {
      return redirectWithError('token_exchange_failed')
    }

    // Store tokens using admin client (matches Windows app pattern)
    const admin = getSupabaseAdmin()

    // Delete any existing tokens (we only need one set org-wide)
    await admin.from('hover_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert new tokens
    const { error: insertError } = await admin.from('hover_tokens').insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })

    if (insertError) {
      console.error('Failed to store Hover tokens:', insertError)
      return redirectWithError('storage: ' + insertError.message)
    }

    const redirectUrl = new URL(returnTo, request.nextUrl.origin)
    redirectUrl.searchParams.set('hover', 'connected')
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Hover callback error:', err)
    const msg = err instanceof Error ? err.message : 'unknown error'
    return redirectWithError('callback: ' + msg)
  }
}
