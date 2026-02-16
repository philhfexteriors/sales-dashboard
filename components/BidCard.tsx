'use client'

import Link from 'next/link'
import { format } from 'date-fns'

export interface BidSummary {
  id: string
  status: string
  client_name: string | null
  client_address: string | null
  cc_account_id: number | null
  trade: string
  grand_total: number
  updated_at: string
  version_number?: number
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
}

function formatTrade(trade: string): string {
  return trade.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function BidCard({ bid }: { bid: BidSummary }) {
  const href = bid.status === 'draft' ? `/bids/${bid.id}/edit` : `/bids/${bid.id}`

  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 truncate">
                {bid.client_name || 'Untitled Bid'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[bid.status] || statusColors.draft}`}>
                {bid.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500">{formatTrade(bid.trade)}</span>
              {bid.version_number != null && bid.version_number > 1 && (
                <span className="text-xs text-gray-400">v{bid.version_number}</span>
              )}
              <span className="text-xs text-gray-400">
                {format(new Date(bid.updated_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          {bid.grand_total != null && bid.grand_total > 0 && (
            <div className="text-right ml-4">
              <p className="font-semibold text-gray-900">
                ${bid.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
