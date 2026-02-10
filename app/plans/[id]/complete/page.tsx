'use client'

import { use, useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CompletePlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasCcAccount, setHasCcAccount] = useState(false)
  const [ccUploadStatus, setCcUploadStatus] = useState<'none' | 'success' | 'failed'>('none')
  const [ccError, setCcError] = useState<string | null>(null)

  // Fetch plan to check if CC account is linked
  useEffect(() => {
    fetch(`/api/plans/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.cc_account_id) setHasCcAccount(true)
      })
      .catch(() => {})
  }, [id])

  async function handleSendEmail() {
    setSending(true)
    try {
      const res = await fetch(`/api/plans/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
        // Show CC upload result
        if (data.cc_upload) {
          if (data.cc_upload.success) {
            setCcUploadStatus('success')
            toast.success('Email sent & uploaded to Contractors Cloud!')
          } else {
            setCcUploadStatus('failed')
            setCcError(data.cc_upload.error || 'Unknown error')
            toast.success('Email sent!')
            toast.error(`CC upload failed: ${data.cc_upload.error || 'Unknown error'}`)
          }
        } else {
          toast.success('Email sent to client and salesperson!')
        }
      } else {
        toast.error(data.error || 'Failed to send email')
      }
    } catch {
      toast.error('Failed to send email')
    }
    setSending(false)
  }

  async function handleDownloadPDF() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/plans/${id}/pdf`)
      if (res.ok) {
        const blob = await res.blob()
        // Extract filename from Content-Disposition header, fallback to generic
        const cd = res.headers.get('Content-Disposition') || ''
        const filenameMatch = cd.match(/filename="?([^";\n]+)"?/)
        const filename = filenameMatch ? filenameMatch[1] : 'H&F Exteriors Production Plan.pdf'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('PDF downloaded!')
      } else {
        toast.error('Failed to generate PDF')
      }
    } catch {
      toast.error('Failed to generate PDF')
    }
    setGenerating(false)
  }

  function sendButtonLabel() {
    if (sent) {
      if (ccUploadStatus === 'success') return 'Sent & Uploaded to CC!'
      if (ccUploadStatus === 'failed') return 'Email Sent (CC Upload Failed)'
      return 'Email Sent!'
    }
    if (sending) return 'Sending...'
    if (hasCcAccount) return 'Send PDF & Upload to Contractors Cloud'
    return 'Send PDF to Client & Salesperson'
  }

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Production Plan Signed!</h1>
        <p className="text-gray-500 mb-8">
          The production plan has been signed and saved successfully.
        </p>

        {/* Email & PDF Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 space-y-4">
          <button
            onClick={handleSendEmail}
            disabled={sending || sent}
            className="w-full py-3 rounded-lg font-semibold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendButtonLabel()}
          </button>

          {/* CC upload status details */}
          {ccUploadStatus === 'success' && (
            <p className="text-sm text-green-600 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              PDF uploaded to Contractors Cloud project files
            </p>
          )}
          {ccUploadStatus === 'failed' && (
            <p className="text-sm text-red-600 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
              CC upload failed: {ccError}
            </p>
          )}

          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="w-full py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/plans/${id}/review`}
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            View Plan
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/plans/new"
            className="px-6 py-3 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors font-medium"
          >
            New Plan
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
