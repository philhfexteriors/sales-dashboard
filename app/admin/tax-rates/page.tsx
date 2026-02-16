'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface TaxRate {
  id: string
  zip_code: string
  state: string | null
  county: string | null
  rate: number
  description: string | null
  updated_at: string
}

export default function TaxRatesAdmin() {
  const [rates, setRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New rate form
  const [newZip, setNewZip] = useState('')
  const [newState, setNewState] = useState('')
  const [newCounty, setNewCounty] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState('')

  useEffect(() => {
    fetchRates()
  }, [])

  async function fetchRates() {
    try {
      const res = await fetch('/api/tax-rates')
      if (res.ok) {
        const data = await res.json()
        setRates(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Failed to load tax rates')
    }
    setLoading(false)
  }

  async function addRate() {
    if (!newZip || !newRate) {
      toast.error('Zip code and rate are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/tax-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip_code: newZip.trim(),
          state: newState.trim() || null,
          county: newCounty.trim() || null,
          rate: parseFloat(newRate) / 100, // Convert percentage to decimal
          description: newDesc.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success('Tax rate added')
        setNewZip('')
        setNewState('')
        setNewCounty('')
        setNewRate('')
        setNewDesc('')
        fetchRates()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  async function updateRate(id: string) {
    setSaving(true)
    try {
      const existing = rates.find(r => r.id === id)
      if (!existing) return

      const res = await fetch(`/api/tax-rates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...existing,
          rate: parseFloat(editRate) / 100,
        }),
      })

      if (res.ok) {
        toast.success('Tax rate updated')
        setEditingId(null)
        fetchRates()
      } else {
        toast.error('Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    }
    setSaving(false)
  }

  async function deleteRate(id: string) {
    if (!confirm('Delete this tax rate?')) return

    try {
      const res = await fetch(`/api/tax-rates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Tax rate deleted')
        fetchRates()
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tax Rates by Zip Code</h1>

        {/* Add new rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Tax Rate</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              value={newZip}
              onChange={e => setNewZip(e.target.value)}
              placeholder="Zip Code*"
              maxLength={5}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={newState}
              onChange={e => setNewState(e.target.value)}
              placeholder="State"
              maxLength={2}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={newCounty}
              onChange={e => setNewCounty(e.target.value)}
              placeholder="County"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              placeholder="Rate %*"
              step="0.125"
              min="0"
              max="20"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={addRate}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Rate list */}
        {loading ? (
          <Loading message="Loading tax rates..." />
        ) : rates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No tax rates configured yet.</p>
            <p className="text-sm mt-1">Add zip codes above to auto-fill tax rates on bids.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Zip Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">State</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">County</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map(rate => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{rate.zip_code}</td>
                    <td className="px-4 py-3">{rate.state || '—'}</td>
                    <td className="px-4 py-3">{rate.county || '—'}</td>
                    <td className="px-4 py-3">
                      {editingId === rate.id ? (
                        <input
                          type="number"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          step="0.125"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <span>{(rate.rate * 100).toFixed(3)}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{rate.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {editingId === rate.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => updateRate(rate.id)}
                            disabled={saving}
                            className="text-primary text-xs font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(rate.id)
                              setEditRate((rate.rate * 100).toFixed(3))
                            }}
                            className="text-primary text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRate(rate.id)}
                            className="text-red-500 text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
