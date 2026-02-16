'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { format } from 'date-fns'
import type { BidSummary } from '@/components/BidCard'

interface PlanSummary {
  id: string
  status: string
  client_name: string | null
  client_address: string | null
  cc_account_id: number | null
  sale_price: number | null
  is_retail: boolean
  is_insurance: boolean
  has_roof: boolean
  has_siding: boolean
  has_guttering: boolean
  has_windows: boolean
  has_small_jobs: boolean
  created_at: string
  updated_at: string
}

interface ClientGroup {
  key: string
  client_name: string
  client_address: string
  bids: BidSummary[]
  plans: PlanSummary[]
  lastActivity: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [bids, setBids] = useState<BidSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    let loaded = 0
    const checkDone = () => { if (++loaded >= 2) setLoading(false) }

    // Fetch all plans
    supabase
      .from('production_plans')
      .select('id, status, client_name, client_address, cc_account_id, sale_price, is_retail, is_insurance, has_roof, has_siding, has_guttering, has_windows, has_small_jobs, created_at, updated_at')
      .eq('created_by', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('Plans fetch error:', error.message)
        setPlans(data || [])
        checkDone()
      })

    // Fetch all bids
    fetch('/api/bids')
      .then(r => r.json())
      .then(data => setBids(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => checkDone())
  }, [user])

  // Group by client
  const groups = groupByClient(bids, plans)

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {groups.length} client{groups.length !== 1 ? 's' : ''} · {bids.length} bid{bids.length !== 1 ? 's' : ''} · {plans.length} plan{plans.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/bids/new"
              className="bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Bid
            </Link>
            <Link
              href="/plans/new"
              className="bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Plan
            </Link>
          </div>
        </div>

        {loading ? (
          <Loading message="Loading..." />
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bids or plans yet</h3>
            <p className="text-gray-500 mb-6">Create your first bid or production plan to get started.</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/bids/new"
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
              >
                Create First Bid
              </Link>
              <Link
                href="/plans/new"
                className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Create First Plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <ClientGroupCard key={group.key} group={group} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function groupByClient(bids: BidSummary[], plans: PlanSummary[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>()

  for (const bid of bids) {
    const key = bid.cc_account_id ? `cc-${bid.cc_account_id}` : `name-${bid.client_name || 'unknown'}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        client_name: bid.client_name || 'Unnamed Client',
        client_address: bid.client_address || '',
        bids: [],
        plans: [],
        lastActivity: bid.updated_at,
      })
    }
    const group = map.get(key)!
    group.bids.push(bid)
    if (bid.updated_at > group.lastActivity) group.lastActivity = bid.updated_at
  }

  for (const plan of plans) {
    const key = plan.cc_account_id ? `cc-${plan.cc_account_id}` : `name-${plan.client_name || 'unknown'}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        client_name: plan.client_name || 'Unnamed Client',
        client_address: plan.client_address || '',
        bids: [],
        plans: [],
        lastActivity: plan.updated_at,
      })
    }
    const group = map.get(key)!
    group.plans.push(plan)
    if (plan.updated_at > group.lastActivity) group.lastActivity = plan.updated_at
  }

  // Sort by most recent activity
  return Array.from(map.values()).sort((a, b) =>
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  )
}

const TRADE_LABELS: Record<string, string> = {
  roof: 'Roof',
  siding: 'Siding',
  gutters: 'Gutters',
  windows: 'Windows',
  fascia_soffit: 'Fascia/Soffit',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  signed: 'bg-green-100 text-green-800',
}

function ClientGroupCard({ group }: { group: ClientGroup }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Client header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{group.client_name}</h3>
            {group.client_address && (
              <p className="text-xs text-gray-500 mt-0.5">{group.client_address}</p>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {format(new Date(group.lastActivity), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {group.bids.map(bid => {
          const href = bid.status === 'draft' ? `/bids/${bid.id}/edit` : `/bids/${bid.id}`
          return (
            <Link key={bid.id} href={href} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">BID</span>
                <span className="text-sm font-medium text-gray-900">
                  {TRADE_LABELS[bid.trade] || bid.trade}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[bid.status] || STATUS_COLORS.draft}`}>
                  {bid.status}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                ${(bid.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </Link>
          )
        })}

        {group.plans.map(plan => {
          const href = plan.status === 'draft' ? `/plans/${plan.id}/edit` : `/plans/${plan.id}`
          const sections = [
            plan.has_roof && 'Roof',
            plan.has_siding && 'Siding',
            plan.has_guttering && 'Gutters',
            plan.has_windows && 'Windows',
            plan.has_small_jobs && 'Small Jobs',
          ].filter(Boolean)

          return (
            <Link key={plan.id} href={href} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">PLAN</span>
                <span className="text-sm font-medium text-gray-900">
                  {sections.join(' + ') || 'Production Plan'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                  {plan.status}
                </span>
              </div>
              {plan.sale_price != null && plan.sale_price > 0 && (
                <span className="text-sm font-semibold text-gray-900">
                  ${plan.sale_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
