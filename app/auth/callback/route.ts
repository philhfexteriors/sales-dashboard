import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/auth/roles'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Check if user email is from hfexteriors.com domain
      const email = user.email || ''
      if (!email.endsWith('@hfexteriors.com')) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=unauthorized`)
      }

      // Determine role based on admin email list
      const role = isAdmin(email) ? 'admin' : 'salesperson'

      // Try to create profile on first login (non-blocking — don't break auth flow)
      try {
        await supabase.from('user_profiles').upsert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role,
        }, { onConflict: 'id', ignoreDuplicates: true })
      } catch (profileErr) {
        console.warn('Profile upsert failed (non-fatal):', profileErr)
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }

    console.error('Auth exchange error:', error)
  }

  return NextResponse.redirect(`${origin}/login`)
}
