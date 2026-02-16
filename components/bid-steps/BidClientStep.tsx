'use client'

import { useEffect, useRef, useState } from 'react'
import { useBidForm } from '@/components/BidFormProvider'

interface CCResult {
  id: number
  name: string
  jobNumber?: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export default function BidClientStep() {
  const { bid, updateBid } = useBidForm()

  // CC search state
  const [ccQuery, setCcQuery] = useState('')
  const [ccResults, setCcResults] = useState<CCResult[]>([])
  const [ccLoading, setCcLoading] = useState(false)
  const [showCcDropdown, setShowCcDropdown] = useState(false)
  const ccTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCcDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleCcSearch(value: string) {
    setCcQuery(value)
    if (ccTimerRef.current) clearTimeout(ccTimerRef.current)

    if (value.length < 2) {
      setCcResults([])
      setShowCcDropdown(false)
      return
    }

    setCcLoading(true)
    ccTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cc/accounts?q=${encodeURIComponent(value)}`)
        if (res.ok) {
          const data = await res.json()
          setCcResults(data)
          setShowCcDropdown(data.length > 0)
        }
      } catch {
        // ignore
      }
      setCcLoading(false)
    }, 400)
  }

  // Auto-fetch tax rate when zip code changes
  useEffect(() => {
    const zip = bid.client_zip?.trim()
    if (!zip || zip.length !== 5) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tax-rates?zip=${encodeURIComponent(zip)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            // rate is stored as decimal (0.0825), convert to percentage (8.25)
            const taxPct = data[0].rate * 100
            updateBid({ tax_rate: taxPct })
          }
        }
      } catch {
        // ignore — user can set tax rate manually
      }
    }, 500)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid.client_zip])

  function selectCcAccount(result: CCResult) {
    updateBid({
      cc_account_id: result.id,
      client_name: result.name,
      client_address: result.address,
      client_city: result.city,
      client_state: result.state,
      client_zip: result.zip,
      client_phone: result.phone,
      client_email: result.email,
    })
    setCcQuery(result.name)
    setShowCcDropdown(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Client Information</h2>
        <p className="text-sm text-gray-500">Search Contractors Cloud or enter client details manually.</p>
      </div>

      {/* CC Search */}
      <div ref={dropdownRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search Contractors Cloud
        </label>
        <input
          type="text"
          value={ccQuery}
          onChange={e => handleCcSearch(e.target.value)}
          placeholder="Search by name, address, or 6-digit job number..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        {ccLoading && (
          <div className="absolute right-3 top-10 w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        )}

        {showCcDropdown && ccResults.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {ccResults.map(result => (
              <button
                key={result.id}
                onClick={() => selectCcAccount(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm">{result.name}</span>
                  {result.jobNumber && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      #{result.jobNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {result.address}, {result.city}, {result.state} {result.zip}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {bid.cc_account_id && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-sm text-green-700">
            Linked to CC Account #{bid.cc_account_id}
          </p>
        </div>
      )}

      {/* Client fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
          <input
            value={bid.client_name}
            onChange={e => updateBid({ client_name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            value={bid.client_address}
            onChange={e => updateBid({ client_address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            value={bid.client_city}
            onChange={e => updateBid({ client_city: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              value={bid.client_state}
              onChange={e => updateBid({ client_state: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              value={bid.client_zip}
              onChange={e => updateBid({ client_zip: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            value={bid.client_phone}
            onChange={e => updateBid({ client_phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={bid.client_email}
            onChange={e => updateBid({ client_email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  )
}
