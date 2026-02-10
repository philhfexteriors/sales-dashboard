'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface TermsVersion {
  id: string
  version: number
  content: string
  active: boolean
  created_at: string
}

export default function TermsAdmin() {
  const [terms, setTerms] = useState<TermsVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTerms() }, [])

  async function fetchTerms() {
    const res = await fetch('/api/terms')
    const data = await res.json()
    setTerms(data)
    const active = data.find((t: TermsVersion) => t.active)
    if (active) setContent(active.content)
    setLoading(false)
  }

  async function saveTerms() {
    setSaving(true)
    const nextVersion = terms.length > 0 ? Math.max(...terms.map(t => t.version)) + 1 : 1
    const res = await fetch('/api/terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, version: nextVersion }),
    })
    if (res.ok) {
      toast.success('Terms & Conditions saved')
      fetchTerms()
    } else {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <div className="p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
          <p className="text-sm text-gray-500 mb-6">
            Edit the terms and conditions that appear on page 2 of the production plan PDF.
            Saving creates a new version — existing signed contracts keep their original version.
          </p>

          {loading ? (
            <Loading />
          ) : (
            <>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm leading-relaxed"
                placeholder="Enter terms and conditions text here..."
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-400">
                  {terms.length > 0 ? `Current version: ${Math.max(...terms.map(t => t.version))}` : 'No versions yet'}
                </p>
                <button
                  onClick={saveTerms}
                  disabled={saving}
                  className="px-5 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save New Version'}
                </button>
              </div>
            </>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  )
}
