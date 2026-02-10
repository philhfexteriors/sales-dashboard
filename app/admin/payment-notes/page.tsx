'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface PaymentNote {
  id: string
  text: string
  sort_order: number
  active: boolean
}

export default function PaymentNotesAdmin() {
  const [notes, setNotes] = useState<PaymentNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    const res = await fetch('/api/payment-notes')
    setNotes(await res.json())
    setLoading(false)
  }

  async function addNote() {
    if (!newText.trim()) return
    const res = await fetch('/api/payment-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText.trim(), sort_order: notes.length }),
    })
    if (res.ok) {
      toast.success('Payment note added')
      setNewText('')
      fetchNotes()
    } else {
      toast.error('Failed to add')
    }
  }

  async function toggleActive(item: PaymentNote) {
    const res = await fetch(`/api/payment-notes/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    if (res.ok) {
      toast.success(item.active ? 'Disabled' : 'Enabled')
      fetchNotes()
    }
  }

  async function deleteNote(id: string) {
    const res = await fetch(`/api/payment-notes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      fetchNotes()
    }
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <div className="p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Note Templates</h1>
          <p className="text-sm text-gray-500 mb-6">
            Manage the payment note templates that salespeople can select on production plans.
          </p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="e.g. Due upon completion"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={e => e.key === 'Enter' && addNote()}
            />
            <button
              onClick={addNote}
              className="px-5 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark"
            >
              Add
            </button>
          </div>

          {loading ? (
            <Loading />
          ) : notes.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No payment note templates yet</p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {notes.map(n => (
                <div key={n.id} className={`flex items-center gap-3 px-4 py-3 ${!n.active ? 'opacity-50' : ''}`}>
                  <span className="flex-1 text-sm">{n.text}</span>
                  <button
                    onClick={() => toggleActive(n)}
                    className={`text-xs px-2 py-1 rounded ${
                      n.active ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {n.active ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => deleteNote(n.id)}
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
