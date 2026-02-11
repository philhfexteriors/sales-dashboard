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
  jobNumber?: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

// Validation helpers
function isValidPhone(value: string): boolean {
  if (!value) return false
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10
}

function isValidEmail(value: string): boolean {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export interface ClientInfoValidation {
  isValid: boolean
  firstInvalidField: string | null
}

export function useClientInfoValidation(plan: { client_name: string; client_address: string; client_city: string; client_state: string; client_zip: string; client_phone: string; client_email: string; is_retail: boolean; is_insurance: boolean; start_date_window_id: string | null }): ClientInfoValidation {
  const fields: { key: string; valid: boolean }[] = [
    { key: 'client_name', valid: !!plan.client_name.trim() },
    { key: 'client_address', valid: !!plan.client_address.trim() },
    { key: 'client_city', valid: !!plan.client_city.trim() },
    { key: 'client_state', valid: !!plan.client_state.trim() },
    { key: 'client_zip', valid: !!plan.client_zip.trim() },
    { key: 'client_phone', valid: isValidPhone(plan.client_phone) },
    { key: 'client_email', valid: isValidEmail(plan.client_email) },
    { key: 'sale_type', valid: plan.is_retail || plan.is_insurance },
    { key: 'start_date_window_id', valid: !!plan.start_date_window_id },
  ]

  const firstInvalid = fields.find(f => !f.valid)
  return {
    isValid: !firstInvalid,
    firstInvalidField: firstInvalid?.key ?? null,
  }
}

export default function ClientInfoStep({ showErrors }: { showErrors?: boolean }) {
  const { plan, updatePlan } = usePlanForm()
  const [startDates, setStartDates] = useState<StartDateWindow[]>([])

  // CC search state
  const [ccQuery, setCcQuery] = useState('')
  const [ccResults, setCcResults] = useState<CCResult[]>([])
  const [ccLoading, setCcLoading] = useState(false)
  const [showCcDropdown, setShowCcDropdown] = useState(false)
  const ccTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Refs for focus management
  const fieldRefs: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
    client_name: useRef<HTMLInputElement>(null),
    client_address: useRef<HTMLInputElement>(null),
    client_city: useRef<HTMLInputElement>(null),
    client_state: useRef<HTMLInputElement>(null),
    client_zip: useRef<HTMLInputElement>(null),
    client_phone: useRef<HTMLInputElement>(null),
    client_email: useRef<HTMLInputElement>(null),
    sale_type: useRef<HTMLInputElement>(null),
    start_date_window_id: useRef<HTMLSelectElement>(null),
  }

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

  // Expose focusFirstInvalid for parent to call
  ClientInfoStep.focusFirstInvalid = (fieldKey: string) => {
    const ref = fieldRefs[fieldKey]
    if (ref?.current) {
      ref.current.focus()
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const hasError = (field: string): boolean => {
    if (!showErrors) return false
    switch (field) {
      case 'client_name': return !plan.client_name.trim()
      case 'client_address': return !plan.client_address.trim()
      case 'client_city': return !plan.client_city.trim()
      case 'client_state': return !plan.client_state.trim()
      case 'client_zip': return !plan.client_zip.trim()
      case 'client_phone': return !isValidPhone(plan.client_phone)
      case 'client_email': return !isValidEmail(plan.client_email)
      case 'sale_type': return !plan.is_retail && !plan.is_insurance
      case 'start_date_window_id': return !plan.start_date_window_id
      default: return false
    }
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
      hasError(field) ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Client Information</h2>
        <p className="text-sm text-gray-500">Search Contractors Cloud or enter details manually.</p>
      </div>

      {/* Client Name with CC Search */}
      <div ref={dropdownRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            ref={fieldRefs.client_name as React.RefObject<HTMLInputElement>}
            type="text"
            value={plan.client_name}
            onChange={e => handleCcSearch(e.target.value)}
            onFocus={() => { if (ccResults.length > 0) setShowCcDropdown(true) }}
            placeholder="Search by name, address, or job number..."
            className={inputClass('client_name')}
          />
          {ccLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
        {hasError('client_name') && (
          <p className="text-xs text-red-500 mt-1">Client name is required</p>
        )}

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
                <p className="font-medium text-gray-900 text-sm">
                  {account.name}
                  {account.jobNumber && (
                    <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      #{account.jobNumber}
                    </span>
                  )}
                </p>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          ref={fieldRefs.client_address as React.RefObject<HTMLInputElement>}
          type="text"
          value={plan.client_address}
          onChange={e => updatePlan({ client_address: e.target.value })}
          placeholder="123 Main St"
          className={inputClass('client_address')}
        />
        {hasError('client_address') && (
          <p className="text-xs text-red-500 mt-1">Address is required</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            ref={fieldRefs.client_city as React.RefObject<HTMLInputElement>}
            type="text"
            value={plan.client_city}
            onChange={e => updatePlan({ client_city: e.target.value })}
            placeholder="City"
            className={inputClass('client_city')}
          />
          {hasError('client_city') && (
            <p className="text-xs text-red-500 mt-1">City is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <input
            ref={fieldRefs.client_state as React.RefObject<HTMLInputElement>}
            type="text"
            value={plan.client_state}
            onChange={e => updatePlan({ client_state: e.target.value })}
            placeholder="IL"
            maxLength={2}
            className={inputClass('client_state')}
          />
          {hasError('client_state') && (
            <p className="text-xs text-red-500 mt-1">Required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP <span className="text-red-500">*</span>
          </label>
          <input
            ref={fieldRefs.client_zip as React.RefObject<HTMLInputElement>}
            type="text"
            inputMode="numeric"
            value={plan.client_zip}
            onChange={e => updatePlan({ client_zip: e.target.value })}
            placeholder="62034"
            maxLength={5}
            className={inputClass('client_zip')}
          />
          {hasError('client_zip') && (
            <p className="text-xs text-red-500 mt-1">Required</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            ref={fieldRefs.client_phone as React.RefObject<HTMLInputElement>}
            type="tel"
            inputMode="tel"
            value={plan.client_phone}
            onChange={e => updatePlan({ client_phone: e.target.value })}
            placeholder="(618) 555-1234"
            className={inputClass('client_phone')}
          />
          {hasError('client_phone') && (
            <p className="text-xs text-red-500 mt-1">
              {plan.client_phone.trim() ? 'Enter a valid phone number (10+ digits)' : 'Phone is required'}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            ref={fieldRefs.client_email as React.RefObject<HTMLInputElement>}
            type="email"
            inputMode="email"
            value={plan.client_email}
            onChange={e => updatePlan({ client_email: e.target.value })}
            placeholder="client@email.com"
            className={inputClass('client_email')}
          />
          {hasError('client_email') && (
            <p className="text-xs text-red-500 mt-1">
              {plan.client_email.trim() ? 'Enter a valid email address' : 'Email is required'}
            </p>
          )}
        </div>
      </div>

      {/* Sale Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sale Type <span className="text-red-500">*</span>
        </label>
        <div ref={fieldRefs.sale_type as React.RefObject<HTMLInputElement>} className="flex gap-3">
          <button
            type="button"
            onClick={() => updatePlan({ is_retail: !plan.is_retail })}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
              plan.is_retail
                ? 'bg-primary text-white border-primary'
                : hasError('sale_type')
                ? 'bg-white text-gray-700 border-red-400'
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
                : hasError('sale_type')
                ? 'bg-white text-gray-700 border-red-400'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            Insurance
          </button>
        </div>
        {hasError('sale_type') && (
          <p className="text-xs text-red-500 mt-1">Select at least one sale type</p>
        )}
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Approx. Start Date <span className="text-red-500">*</span>
        </label>
        <select
          ref={fieldRefs.start_date_window_id as React.RefObject<HTMLSelectElement>}
          value={plan.start_date_window_id || ''}
          onChange={e => updatePlan({ start_date_window_id: e.target.value || null })}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white ${
            hasError('start_date_window_id') ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
        >
          <option value="">Select window...</option>
          {startDates.map(d => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
        {hasError('start_date_window_id') && (
          <p className="text-xs text-red-500 mt-1">Select an approximate start date</p>
        )}
      </div>
    </div>
  )
}

// Static method for external focus triggering
ClientInfoStep.focusFirstInvalid = (_fieldKey: string) => {}
