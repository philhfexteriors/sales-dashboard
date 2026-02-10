'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlanForm } from '@/components/PlanFormProvider'

interface StartDateWindow {
  id: string
  label: string
  active: boolean
}

interface CCResult {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export default function ClientInfoStep() {
  const { plan, updatePlan } = usePlanForm()
  const [startDates, setStartDates] = useState<StartDateWindow[]>([])

  // CC search state
  const [ccQuery, setCcQuery] = useState('')
  const [ccResults, setCcResults] = useState<CCResult[]>([])
  const [ccLoading, setCcLoading] = useState(false)
  const [showCcDropdown, setShowCcDropdown] = useState(false)
  const ccTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/start-dates')
      .then(r => r.json())
      .then(data => setStartDates((data || []).filter((d: StartDateWindow) => d.active)))
  }, [])

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

  // Debounced CC search
  function handleCcSearch(value: string) {
    setCcQuery(value)
    updatePlan({ client_name: value })

    if (ccTimerRef.current) clearTimeout(ccTimerRef.current)
    if (value.length < 2) {
      setCcResults([])
      setShowCcDropdown(false)
      return
    }

    ccTimerRef.current = setTimeout(async () => {
      setCcLoading(true)
      try {
        const res = await fetch(`/api/cc/accounts?q=${encodeURIComponent(value)}`)
        if (res.ok) {
          const data = await res.json()
          setCcResults(data)
          setShowCcDropdown(data.length > 0)
        }
      } catch {
        // Silent fail — CC not configured or network error
      }
      setCcLoading(false)
    }, 300)
  }

  function selectCcAccount(account: CCResult) {
    updatePlan({
      cc_account_id: account.id,
      client_name: account.name,
      client_address: account.address || '',
      client_city: account.city || '',
      client_state: account.state || '',
      client_zip: account.zip || '',
      client_phone: account.phone || '',
      client_email: account.email || '',
    })
    setCcQuery(account.name)
    setShowCcDropdown(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Client Information</h2>
        <p className="text-sm text-gray-500">Search Contractors Cloud or enter details manually.</p>
      </div>

      {/* Client Name with CC Search */}
      <div ref={dropdownRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
        <div className="relative">
          <input
            type="text"
            value={plan.client_name}
            onChange={e => handleCcSearch(e.target.value)}
            onFocus={() => { if (ccResults.length > 0) setShowCcDropdown(true) }}
            placeholder="Search Contractors Cloud or type name..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {ccLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* CC Dropdown */}
        {showCcDropdown && ccResults.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
            {ccResults.map(account => (
              <button
                key={account.id}
                type="button"
                onClick={() => selectCcAccount(account)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <p className="font-medium text-gray-900 text-sm">{account.name}</p>
                <p className="text-xs text-gray-500">
                  {[account.address, account.city, account.state].filter(Boolean).join(', ')}
                  {account.phone ? ` · ${account.phone}` : ''}
                </p>
              </button>
            ))}
          </div>
        )}

        {plan.cc_account_id && (
          <p className="mt-1 text-xs text-green-600">
            Linked to Contractors Cloud account #{plan.cc_account_id}
          </p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input
          type="text"
          value={plan.client_address}
          onChange={e => updatePlan({ client_address: e.target.value })}
          placeholder="123 Main St"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={plan.client_city}
            onChange={e => updatePlan({ client_city: e.target.value })}
            placeholder="City"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            value={plan.client_state}
            onChange={e => updatePlan({ client_state: e.target.value })}
            placeholder="IL"
            maxLength={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
          <input
            type="text"
            inputMode="numeric"
            value={plan.client_zip}
            onChange={e => updatePlan({ client_zip: e.target.value })}
            placeholder="62034"
            maxLength={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            inputMode="tel"
            value={plan.client_phone}
            onChange={e => updatePlan({ client_phone: e.target.value })}
            placeholder="(618) 555-1234"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            inputMode="email"
            value={plan.client_email}
            onChange={e => updatePlan({ client_email: e.target.value })}
            placeholder="client@email.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Sale Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sale Type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updatePlan({ is_retail: !plan.is_retail })}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
              plan.is_retail
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Retail Sale
          </button>
          <button
            type="button"
            onClick={() => updatePlan({ is_insurance: !plan.is_insurance })}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
              plan.is_insurance
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Insurance
          </button>
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Approx. Start Date</label>
        <select
          value={plan.start_date_window_id || ''}
          onChange={e => updatePlan({ start_date_window_id: e.target.value || null })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        >
          <option value="">Select window...</option>
          {startDates.map(d => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
