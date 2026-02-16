'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import toast from 'react-hot-toast'

export default function NewBid() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    const res = await fetch('/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (res.ok) {
      const { bid } = await res.json()
      router.push(`/bids/${bid.id}/edit`)
    } else {
      toast.error('Failed to create bid')
      setCreating(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">New Bid</h1>
        <p className="text-gray-500 mb-8">
          Create a new bid. You&apos;ll select a client, choose the trade, match Hover measurements, and build out the line items.
        </p>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {creating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start New Bid
            </>
          )}
        </button>
      </div>
    </AppShell>
  )
}
