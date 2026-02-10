'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface StartDateWindow {
  id: string
  label: string
  sort_order: number
  active: boolean
}

export default function StartDatesAdmin() {
  const [windows, setWindows] = useState<StartDateWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => { fetchWindows() }, [])

  async function fetchWindows() {
    const res = await fetch('/api/start-dates')
    setWindows(await res.json())
    setLoading(false)
  }

  async function addWindow() {
    if (!newLabel.trim()) return
    const res = await fetch('/api/start-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim(), sort_order: windows.length }),
    })
    if (res.ok) {
      toast.success('Start date window added')
      setNewLabel('')
      fetchWindows()
    } else {
      toast.error('Failed to add')
    }
  }

  async function toggleActive(item: StartDateWindow) {
    const res = await fetch(`/api/start-dates/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    if (res.ok) {
      toast.success(item.active ? 'Disabled' : 'Enabled')
      fetchWindows()
    }
  }

  async function deleteWindow(id: string) {
    const res = await fetch(`/api/start-dates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      fetchWindows()
    }
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <div className="p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Start Date Windows</h1>
          <p className="text-sm text-gray-500 mb-6">
            Manage the approximate start date options that salespeople can select.
          </p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. March/April 2026"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={e => e.key === 'Enter' && addWindow()}
            />
            <button
              onClick={addWindow}
              className="px-5 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark"
            >
              Add
            </button>
          </div>

          {loading ? (
            <Loading />
          ) : windows.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No start date windows yet</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {windows.map(w => (
                <div key={w.id} className={`flex items-center gap-3 px-4 py-3 ${!w.active ? 'opacity-50' : ''}`}>
                  <span className="flex-1 text-sm font-medium">{w.label}</span>
                  <button
                    onClick={() => toggleActive(w)}
                    className={`text-xs px-2 py-1 rounded ${
                      w.active ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {w.active ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => deleteWindow(w.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  )
}
