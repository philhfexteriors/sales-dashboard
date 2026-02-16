'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { BidData, BidLineItem } from '@/components/BidFormProvider'

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
}

export default function ViewBid({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [bid, setBid] = useState<BidData | null>(null)
  const [lineItems, setLineItems] = useState<BidLineItem[]>([])
  const [versionNumber, setVersionNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    fetch(`/api/bids/${id}`)
      .then(r => r.json())
      .then(data => {
        setBid(data.bid)
        setLineItems(data.lineItems || [])
        setVersionNumber(data.version?.version_number || 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/bids/${id}/pdf`, { method: 'POST' })
      if (res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType?.includes('application/pdf')) {
          // PDF returned directly (storage bucket didn't exist)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
        } else {
          const data = await res.json()
          if (data.pdf_url) window.open(data.pdf_url, '_blank')
        }
        toast.success('PDF generated')
      } else {
        toast.error('Failed to generate PDF')
      }
    } catch {
      toast.error('Failed to generate PDF')
    }
    setGeneratingPdf(false)
  }

  async function handleConvertToPlan() {
    try {
      const res = await fetch(`/api/bids/${id}/convert`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success('Production plan created')
        router.push(`/plans/${data.planId}/edit`)
      } else {
        toast.error('Failed to convert to plan')
      }
    } catch {
      toast.error('Failed to convert to plan')
    }
  }

  if (loading) {
    return (
      <AppShell>
        <Loading message="Loading bid..." />
      </AppShell>
    )
  }

  if (!bid) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p className="text-gray-500">Bid not found</p>
          <Link href="/bids" className="text-primary mt-2 inline-block">Back to Bids</Link>
        </div>
      </AppShell>
    )
  }

  const materialsItems = lineItems.filter(li => li.section === 'materials')
  const laborItems = lineItems.filter(li => li.section === 'labor')
  const materialsTotal = materialsItems.reduce((sum, li) => sum + li.line_total, 0)
  const laborTotal = laborItems.reduce((sum, li) => sum + li.line_total, 0)

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/bids" className="text-sm text-gray-500 hover:text-primary mb-2 inline-block">
              &larr; Back to Bids
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {bid.client_name || 'Untitled Bid'}
              </h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[bid.status] || statusColors.draft}`}>
                {bid.status}
              </span>
              <span className="text-sm text-gray-400">v{versionNumber}</span>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Client</h3>
          <p className="font-medium text-gray-900">{bid.client_name || 'No client'}</p>
          {bid.client_address && (
            <p className="text-sm text-gray-600">
              {bid.client_address}, {bid.client_city}, {bid.client_state} {bid.client_zip}
            </p>
          )}
          {bid.client_phone && <p className="text-sm text-gray-600">{bid.client_phone}</p>}
          {bid.client_email && <p className="text-sm text-gray-600">{bid.client_email}</p>}
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Configuration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Trade:</span>
              <span className="ml-1 font-medium capitalize">{bid.trade.replace('_', ' ')}</span>
            </div>
            {bid.material_variant && (
              <div>
                <span className="text-gray-500">Material:</span>
                <span className="ml-1 font-medium capitalize">{bid.material_variant}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Margin:</span>
              <span className="ml-1 font-medium">{bid.default_margin_pct}%</span>
            </div>
            {bid.pitch && (
              <div>
                <span className="text-gray-500">Pitch:</span>
                <span className="ml-1 font-medium">{bid.pitch}</span>
              </div>
            )}
          </div>
        </div>

        {/* Materials Table */}
        {materialsItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Materials</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="px-4 py-2 font-medium text-gray-500">Item</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Customer Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {materialsItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.qty}</td>
                    <td className="px-4 py-2 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-2 text-right font-medium">${item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-2 text-right font-medium text-gray-700">Materials Subtotal</td>
                  <td className="px-4 py-2 text-right font-semibold">${materialsTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Labor Table */}
        {laborItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Labor</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="px-4 py-2 font-medium text-gray-500">Item</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-2 font-medium text-gray-500 text-right">Customer Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {laborItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.qty}</td>
                    <td className="px-4 py-2 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-2 text-right font-medium">${item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-2 text-right font-medium text-gray-700">Labor Subtotal</td>
                  <td className="px-4 py-2 text-right font-semibold">${laborTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="bg-gray-900 text-white rounded-xl p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Materials:</span>
              <span>${materialsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Labor:</span>
              <span>${laborTotal.toFixed(2)}</span>
            </div>
            {bid.tax_total > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Tax ({bid.tax_rate}%):</span>
                <span>${bid.tax_total.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
              <span>Total:</span>
              <span>${bid.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {bid.status === 'draft' && (
            <Link
              href={`/bids/${id}/edit`}
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              Edit Bid
            </Link>
          )}
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {generatingPdf ? 'Generating...' : 'Generate PDF'}
          </button>
          {bid.status === 'accepted' && (
            <button
              onClick={handleConvertToPlan}
              className="px-6 py-3 border border-primary text-primary rounded-xl font-medium hover:bg-primary/5 transition-colors"
            >
              Convert to Production Plan
            </button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
