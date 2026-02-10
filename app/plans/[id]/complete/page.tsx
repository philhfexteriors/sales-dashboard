'use client'

import { use, useState } from 'react'
import AppShell from '@/components/AppShell'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CompletePlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [generating, setGenerating] = useState(false)

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
            toast.success('Email sent & uploaded to Contractors Cloud!')
          } else {
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
            {sent ? 'Email Sent!' : sending ? 'Sending...' : 'Send PDF to Client & Salesperson'}
          </button>

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
