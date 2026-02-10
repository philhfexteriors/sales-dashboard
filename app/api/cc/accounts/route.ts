import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCCClient } from '@/lib/services/contractorsCloudApi'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') || ''
  if (q.length < 2) {
    return NextResponse.json([])
  }

  const client = createCCClient()
  if (!client) {
    return NextResponse.json({ error: 'Contractors Cloud not configured' }, { status: 503 })
  }

  try {
    const accounts = await client.searchAccounts(q)

    // Return simplified results for the dropdown
    const results = accounts.map(a => {
      const firstName = a.primary_first_name || ''
      const lastName = a.primary_last_name || ''
      const contactName = [firstName, lastName].filter(Boolean).join(' ') || a.name
      const phone = a.primary_phone_cell || a.primary_phone_home || a.primary_phone_work || ''
      const email = a.primary_email || ''

      return {
        id: a.id,
        name: contactName,
        address: a.address_street,
        city: a.address_city,
        state: a.address_state,
        zip: a.address_zip,
        phone,
        email,
      }
    })

    return NextResponse.json(results)
  } catch (err) {
    console.error('CC account search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
