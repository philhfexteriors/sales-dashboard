import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCCClient } from '@/lib/services/contractorsCloudApi'

function formatAccount(a: {
  id: number
  name: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  primary_first_name: string | null
  primary_last_name: string | null
  primary_phone_cell: string | null
  primary_phone_home: string | null
  primary_phone_work: string | null
  primary_email: string | null
}, jobNumber?: string) {
  const firstName = a.primary_first_name || ''
  const lastName = a.primary_last_name || ''
  const contactName = [firstName, lastName].filter(Boolean).join(' ') || a.name
  const phone = a.primary_phone_cell || a.primary_phone_home || a.primary_phone_work || ''
  const email = a.primary_email || ''

  return {
    id: a.id,
    name: contactName,
    jobNumber: jobNumber || undefined,
    address: a.address_street,
    city: a.address_city,
    state: a.address_state,
    zip: a.address_zip,
    phone,
    email,
  }
}

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
    // Detect job number queries: 6-digit numbers (e.g., 222xxx, 223xxx)
    const isJobNumber = /^\d{6}$/.test(q.trim())

    if (isJobNumber) {
      // Search projects by job number, then return account info
      const projects = await client.searchProjectsByNumber(q.trim())

      const results = projects
        .filter(p => p.account)
        .map(p => formatAccount(p.account!, p.number || undefined))

      return NextResponse.json(results)
    }

    // Standard account search (name, address, etc.)
    const accounts = await client.searchAccounts(q)

    // Fetch projects for each account in parallel to get job numbers
    const results = await Promise.all(
      accounts.map(async (a) => {
        let jobNumber: string | undefined
        try {
          const projects = await client.getProjectsByAccount(a.id)
          // Find the most recent sold project (has a real number, not "Lead")
          const soldProject = projects.find(p => p.number && p.number !== 'Lead')
          if (soldProject) {
            jobNumber = soldProject.number || undefined
          }
        } catch {
          // Non-critical — just skip the job number
        }
        return formatAccount(a, jobNumber)
      })
    )

    return NextResponse.json(results)
  } catch (err) {
    console.error('CC account search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
