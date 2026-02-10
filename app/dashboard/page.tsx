'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { format } from 'date-fns'

interface PlanSummary {
  id: string
  status: string
  client_name: string | null
  client_address: string | null
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }

    async function fetchPlans() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('production_plans')
          .select('id, status, client_name, client_address, sale_price, is_retail, is_insurance, has_roof, has_siding, has_guttering, has_windows, has_small_jobs, created_at, updated_at')
          .eq('created_by', user!.id)
          .order('updated_at', { ascending: false })

        if (error) console.warn('Plans fetch error:', error.message)
        setPlans(data || [])
      } catch (err) {
        console.warn('Plans fetch error:', err)
      }
      setLoading(false)
    }

    fetchPlans()
  }, [user, authLoading])

  const drafts = plans.filter(p => p.status === 'draft')
  const completed = plans.filter(p => p.status !== 'draft')

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Plans</h1>
            <p className="text-sm text-gray-500 mt-1">
              {plans.length} total plan{plans.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/plans/new"
            className="bg-primary text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Plan
          </Link>
        </div>

        {loading ? (
          <Loading message="Loading plans..." />
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No production plans yet</h3>
            <p className="text-gray-500 mb-6">Create your first production plan to get started.</p>
            <Link
              href="/plans/new"
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
            >
              Create First Plan
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {drafts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  Drafts ({drafts.length})
                </h2>
                <div className="space-y-3">
                  {drafts.map(plan => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Completed ({completed.length})
                </h2>
                <div className="space-y-3">
                  {completed.map(plan => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function PlanCard({ plan }: { plan: PlanSummary }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    signed: 'bg-green-100 text-green-800',
    sent: 'bg-gray-100 text-gray-800',
  }

  const sections = [
    plan.has_roof && 'Roof',
    plan.has_siding && 'Siding',
    plan.has_guttering && 'Guttering',
    plan.has_windows && 'Windows',
    plan.has_small_jobs && 'Small Jobs',
  ].filter(Boolean)

  const href = plan.status === 'draft' ? `/plans/${plan.id}/edit` : `/plans/${plan.id}`

  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">
                {plan.client_name || 'Untitled Plan'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status] || statusColors.draft}`}>
                {plan.status}
              </span>
            </div>
            {plan.client_address && (
              <p className="text-sm text-gray-500 truncate">{plan.client_address}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {sections.length > 0 && (
                <span className="text-xs text-gray-400">
                  {sections.join(' + ')}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {format(new Date(plan.updated_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          {plan.sale_price != null && plan.sale_price > 0 && (
            <div className="text-right ml-4">
              <p className="font-semibold text-gray-900">
                ${plan.sale_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
