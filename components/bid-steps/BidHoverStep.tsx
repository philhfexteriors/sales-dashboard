'use client'

import { useEffect, useRef, useState } from 'react'
import { useBidForm } from '@/components/BidFormProvider'
import type { HoverJob } from '@/lib/services/hoverTypes'

interface HoverStatus {
  configured: boolean
  connected: boolean
}

export default function BidHoverStep() {
  const { bid, updateBid } = useBidForm()
  const [status, setStatus] = useState<HoverStatus | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<HoverJob[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check Hover connection status
  useEffect(() => {
    fetch('/api/hover/status')
      .then(r => {
        if (!r.ok) {
          console.warn('[HoverStep] Status API returned', r.status)
          return { configured: false, connected: false }
        }
        return r.json()
      })
      .then(data => {
        if (data.configured !== undefined) {
          setStatus(data)
        } else {
          console.warn('[HoverStep] Unexpected response:', data)
          setStatus({ configured: false, connected: false })
        }
      })
      .catch(() => setStatus({ configured: false, connected: false }))
      .finally(() => setStatusLoading(false))
  }, [])

  // Auto-populate search from client address
  useEffect(() => {
    if (bid.client_address && !search && !bid.hover_job_id) {
      const addr = bid.client_address.split(',')[0].trim()
      if (addr.length >= 3) {
        setSearch(addr)
        performSearch(addr)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid.client_address])

  function handleSearch(value: string) {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.length < 3) {
      setResults([])
      return
    }
    searchTimerRef.current = setTimeout(() => performSearch(value), 500)
  }

  async function performSearch(query: string) {
    setLoading(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/hover/jobs?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      } else if (res.status === 503) {
        setSearchError('Hover connection lost. Try re-connecting your Hover account.')
        setResults([])
      } else {
        const data = await res.json().catch(() => ({}))
        setSearchError(data.error || `Search failed (${res.status})`)
        setResults([])
      }
    } catch {
      setSearchError('Network error — could not reach server.')
      setResults([])
    }
    setLoading(false)
  }

  function selectJob(job: HoverJob) {
    // Pick the first complete model
    const model = job.models.find(m => m.state === 'complete')
    const addr = job.address
    const fullAddress = [addr.location_line_1, addr.city, addr.region, addr.postal_code].filter(Boolean).join(', ')

    updateBid({
      hover_job_id: job.id,
      hover_model_id: model?.id || null,
      hover_address: fullAddress,
    })
  }

  function clearSelection() {
    updateBid({
      hover_job_id: null,
      hover_model_id: null,
      hover_address: null,
      measurements_json: null,
    })
  }

  if (statusLoading) {
    return <div className="py-8 text-center text-gray-500">Checking Hover connection...</div>
  }

  if (!status?.configured) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Hover Integration</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            Hover is not configured. Add HOVER_CLIENT_ID and HOVER_CLIENT_SECRET to your environment variables.
          </p>
        </div>
        <p className="text-sm text-gray-500">
          You can skip this step and enter measurements manually.
        </p>
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Connect Hover</h2>
        <p className="text-sm text-gray-500">Connect your Hover account to pull measurement data.</p>
        <a
          href={`/api/hover/authorize?return_to=${encodeURIComponent(window.location.pathname)}`}
          className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
        >
          Connect Hover Account
        </a>
        <p className="text-sm text-gray-500 mt-4">
          Or skip this step to enter measurements manually.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Hover Job Match</h2>
        <p className="text-sm text-gray-500">
          Search for the property in Hover to import measurements.
        </p>
      </div>

      {bid.hover_job_id ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Hover Job Selected</p>
              <p className="text-xs text-green-600 mt-1">
                Job #{bid.hover_job_id} · Model #{bid.hover_model_id}
              </p>
              {bid.hover_address && (
                <p className="text-xs text-green-600">{bid.hover_address}</p>
              )}
            </div>
            <button
              onClick={clearSelection}
              className="text-sm text-green-700 hover:text-green-900 font-medium"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by address or name (min 3 characters)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {loading && (
              <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map(job => {
                const addr = job.address
                const hasModel = job.models.some(m => m.state === 'complete')
                return (
                  <button
                    key={job.id}
                    onClick={() => selectJob(job)}
                    disabled={!hasModel}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      hasModel
                        ? 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer'
                        : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm">{job.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        hasModel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {hasModel ? 'Ready' : 'No Model'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {addr.location_line_1}, {addr.city}, {addr.region} {addr.postal_code}
                    </p>
                    {hasModel && (
                      <p className="text-xs text-gray-400 mt-1">
                        {job.models.filter(m => m.state === 'complete').length} model(s) available
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
              <p className="text-red-800 font-medium">{searchError}</p>
              {searchError.includes('connection lost') && (
                <a
                  href={`/api/hover/authorize?return_to=${encodeURIComponent(window.location.pathname)}`}
                  className="inline-block mt-2 text-primary font-medium hover:text-primary-dark"
                >
                  Re-connect Hover Account
                </a>
              )}
            </div>
          )}

          {search.length >= 3 && !loading && !searchError && results.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">
              No Hover jobs found. You can skip this step and enter measurements manually.
            </p>
          )}
        </>
      )}
    </div>
  )
}
