'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useBidForm } from '@/components/BidFormProvider'
import toast from 'react-hot-toast'

interface RelatedBid {
  id: string
  trade: string
  status: string
  grand_total: number
}

const TRADE_LABELS: Record<string, string> = {
  roof: 'Roofing',
  siding: 'Siding',
  gutters: 'Gutters',
  windows: 'Windows',
  fascia_soffit: 'Fascia & Soffit',
}

export default function RelatedBids() {
  const { bid } = useBidForm()
  const router = useRouter()
  const [related, setRelated] = useState<RelatedBid[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!bid.cc_account_id && !bid.client_name) return

    const params = new URLSearchParams()
    if (bid.cc_account_id) {
      params.set('cc_account_id', String(bid.cc_account_id))
    }

    fetch(`/api/bids?${params}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter out current bid
          setRelated(data.filter((b: RelatedBid) => b.id !== bid.id))
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid.id, bid.cc_account_id])

  async function createForTrade(trade: string) {
    setCreating(true)
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade,
          cc_account_id: bid.cc_account_id,
          client_name: bid.client_name,
          client_address: bid.client_address,
          client_city: bid.client_city,
          client_state: bid.client_state,
          client_zip: bid.client_zip,
          client_phone: bid.client_phone,
          client_email: bid.client_email,
          hover_job_id: bid.hover_job_id,
          hover_model_id: bid.hover_model_id,
          hover_address: bid.hover_address,
          tax_rate: bid.tax_rate,
        }),
      })

      if (res.ok) {
        const { bid: newBid } = await res.json()
        toast.success(`${TRADE_LABELS[trade]} bid created`)
        router.push(`/bids/${newBid.id}/edit`)
      } else {
        toast.error('Failed to create bid')
      }
    } catch {
      toast.error('Failed to create bid')
    }
    setCreating(false)
  }

  // Get trades that don't have a bid yet
  const existingTrades = [bid.trade, ...related.map(b => b.trade)]
  const availableTrades = Object.keys(TRADE_LABELS).filter(t => !existingTrades.includes(t))

  if (related.length === 0 && availableTrades.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-blue-900 mb-2">
        Related Bids for {bid.client_name || 'this client'}
      </h3>

      {/* Existing related bids */}
      {related.length > 0 && (
        <div className="space-y-1 mb-3">
          {related.map(b => (
            <Link
              key={b.id}
              href={`/bids/${b.id}/edit`}
              className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-blue-100 transition-colors"
            >
              <span className="font-medium text-blue-800">
                {TRADE_LABELS[b.trade] || b.trade}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">
                  ${b.grand_total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
                <span className="text-xs text-blue-500 capitalize">{b.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add bids for other trades */}
      {availableTrades.length > 0 && (
        <div>
          <p className="text-xs text-blue-600 mb-2">Add another trade for this client:</p>
          <div className="flex flex-wrap gap-2">
            {availableTrades.map(trade => (
              <button
                key={trade}
                onClick={() => createForTrade(trade)}
                disabled={creating}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
              >
                + {TRADE_LABELS[trade]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
