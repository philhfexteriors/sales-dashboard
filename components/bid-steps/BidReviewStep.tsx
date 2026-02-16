'use client'

import { useBidForm } from '@/components/BidFormProvider'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function BidReviewStep() {
  const { bid, lineItems, saveNow } = useBidForm()
  const router = useRouter()
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)

  const materialsItems = lineItems.filter(li => li.section === 'materials')
  const laborItems = lineItems.filter(li => li.section === 'labor')
  const materialsTotal = materialsItems.reduce((sum, li) => sum + li.line_total, 0)
  const laborTotal = laborItems.reduce((sum, li) => sum + li.line_total, 0)

  async function handleGeneratePdf() {
    await saveNow()
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/bids/${bid.id}/pdf`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.pdf_url) {
          window.open(data.pdf_url, '_blank')
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

  async function handleCreateVersion() {
    await saveNow()
    setCreatingVersion(true)
    try {
      const res = await fetch(`/api/bids/${bid.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'New version' }),
      })
      if (res.ok) {
        toast.success('New version created')
        window.location.reload()
      } else {
        toast.error('Failed to create version')
      }
    } catch {
      toast.error('Failed to create version')
    }
    setCreatingVersion(false)
  }

  async function handleConvertToPlan() {
    await saveNow()
    try {
      const res = await fetch(`/api/bids/${bid.id}/convert`, { method: 'POST' })
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Bid Review</h2>
        <p className="text-sm text-gray-500">Review the bid before generating a PDF or converting to a production plan.</p>
      </div>

      {/* Client info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Client</h3>
        <p className="font-medium text-gray-900">{bid.client_name || 'No client'}</p>
        {bid.client_address && (
          <p className="text-sm text-gray-600">
            {bid.client_address}, {bid.client_city}, {bid.client_state} {bid.client_zip}
          </p>
        )}
        {bid.client_phone && <p className="text-sm text-gray-600">{bid.client_phone}</p>}
      </div>

      {/* Trade info */}
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

      {/* Materials */}
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

      {/* Labor */}
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
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Total Margin (internal):</span>
            <span>${bid.margin_total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleGeneratePdf}
          disabled={generatingPdf}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {generatingPdf ? 'Generating...' : 'Generate PDF'}
        </button>
        <button
          onClick={handleCreateVersion}
          disabled={creatingVersion}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {creatingVersion ? 'Creating...' : 'Create New Version'}
        </button>
        <button
          onClick={handleConvertToPlan}
          className="px-6 py-3 border border-primary text-primary rounded-xl font-medium hover:bg-primary/5 transition-colors"
        >
          Convert to Production Plan
        </button>
      </div>
    </div>
  )
}
