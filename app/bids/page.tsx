'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import BidCard, { type BidSummary } from '@/components/BidCard'
import Link from 'next/link'

const STATUS_FILTERS = ['all', 'draft', 'sent', 'accepted', 'rejected'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

export default function BidsPage() {
  const { user } = useAuth()
  const [bids, setBids] = useState<BidSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!user) return

    setLoading(true)
    const url = activeFilter === 'all'
      ? '/api/bids'
      : `/api/bids?status=${activeFilter}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setBids(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, activeFilter])

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bids</h1>
            <p className="text-sm text-gray-500 mt-1">
              {bids.length} bid{bids.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/bids/new"
            className="bg-primary text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Bid
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading message="Loading bids..." />
        ) : bids.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {activeFilter === 'all' ? 'No bids yet' : `No ${activeFilter} bids`}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeFilter === 'all'
                ? 'Create your first bid to get started.'
                : 'Try a different filter or create a new bid.'}
            </p>
            {activeFilter === 'all' && (
              <Link
                href="/bids/new"
                className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
              >
                Create First Bid
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map(bid => (
              <BidCard key={bid.id} bid={bid} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
