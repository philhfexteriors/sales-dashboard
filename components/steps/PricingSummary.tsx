'use client'

import { useEffect, useState, useRef } from 'react'
import { usePlanForm } from '@/components/PlanFormProvider'
import CurrencyInput from '@/components/fields/CurrencyInput'
import { CustomLineItems } from '@/components/sections/SectionField'
import Link from 'next/link'

interface PaymentNote { id: string; text: string; active: boolean }

export default function PricingSummary() {
  const { plan, lineItems, updatePlan, calculateTotals } = usePlanForm()
  const [paymentNotes, setPaymentNotes] = useState<PaymentNote[]>([])
  const [customPaymentNote, setCustomPaymentNote] = useState(false)
  const [downPaymentEditing, setDownPaymentEditing] = useState(false)
  const hasSetDefaultDownPayment = useRef(false)

  useEffect(() => {
    fetch('/api/payment-notes')
      .then(r => r.json())
      .then(data => setPaymentNotes((data || []).filter((n: PaymentNote) => n.active)))
  }, [])

  // Recalculate totals whenever line items change
  useEffect(() => {
    calculateTotals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItems.map(li => li.amount).join(',')])

  // Default down payment to 60% of sale price for retail jobs
  useEffect(() => {
    if (!plan.is_retail || !plan.sale_price || downPaymentEditing) return
    // Only auto-set if down_payment hasn't been manually edited
    if (!hasSetDefaultDownPayment.current && (plan.down_payment == null || plan.down_payment === 0)) {
      const defaultDown = Math.round(plan.sale_price * 0.6 * 100) / 100
      updatePlan({ down_payment: defaultDown })
      hasSetDefaultDownPayment.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.is_retail, plan.sale_price])

  // Group line items by section — show items that have data even without a price
  const sections = ['roof', 'siding', 'guttering', 'windows', 'small_jobs', 'misc']
  const groupedItems = sections.map(section => ({
    section,
    items: lineItems.filter(li => li.section === section && (li.amount > 0 || li.description || hasSelections(li))),
  })).filter(g => g.items.length > 0)

  const formatMoney = (val: number | null) =>
    val != null && val > 0 ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''

  const formatMoneyOrDash = (val: number | null) =>
    val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'

  // Calculate default 60% for display
  const defaultDownPayment = plan.sale_price ? Math.round(plan.sale_price * 0.6 * 100) / 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Pricing & Review</h2>
        <p className="text-sm text-gray-500">Review all line items and finalize pricing.</p>
      </div>

      {/* Line Items by Section */}
      {groupedItems.map(group => (
        <div key={group.section} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 capitalize">{group.section.replace('_', ' ')}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {group.items.map(item => (
              <div key={`${item.section}-${item.field_key}`} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {item.field_key.replace(/_/g, ' ').replace(/custom \d+/, 'Custom Item')}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  )}
                  {item.selections && Object.keys(item.selections).length > 0 && (
                    <p className="text-xs text-gray-500">
                      {Object.entries(item.selections)
                        .filter(([k]) => !k.endsWith('_id'))
                        .map(([, v]) => v)
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  )}
                </div>
                <span className={`font-medium ml-4 ${item.amount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                  {formatMoney(item.amount) || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Misc Items */}
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Misc Items</h3>
        <CustomLineItems section="misc" />
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border-2 border-primary/20 p-6 space-y-4">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold text-gray-900">Sale Price (RCV + Upgrades - Credits)</span>
          <span className="font-bold text-primary">{formatMoneyOrDash(plan.sale_price)}</span>
        </div>

        {plan.is_insurance && (
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Insurance Proceeds</span>
            <CurrencyInput
              value={plan.insurance_proceeds || 0}
              onChange={val => updatePlan({ insurance_proceeds: val })}
              className="w-40"
            />
          </div>
        )}

        {plan.is_retail && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Down Payment</span>
              {!downPaymentEditing && plan.down_payment === defaultDownPayment && defaultDownPayment > 0 && (
                <span className="text-xs text-gray-400">(60%)</span>
              )}
            </div>
            {downPaymentEditing ? (
              <CurrencyInput
                value={plan.down_payment || 0}
                onChange={val => updatePlan({ down_payment: val })}
                className="w-40"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{formatMoneyOrDash(plan.down_payment)}</span>
                <button
                  type="button"
                  onClick={() => setDownPaymentEditing(true)}
                  className="text-xs text-primary hover:text-primary-dark font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {(plan.is_insurance || plan.is_retail) && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-lg">
            <span className="font-semibold text-gray-900">
              Homeowner Out-of-pocket
            </span>
            <span className="font-bold text-primary">{formatMoneyOrDash(plan.out_of_pocket)}</span>
          </div>
        )}
      </div>

      {/* Payment Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Notes</label>
        {customPaymentNote ? (
          <div className="flex gap-2">
            <textarea
              value={plan.payment_notes || ''}
              onChange={e => updatePlan({ payment_notes: e.target.value })}
              rows={3}
              placeholder="Custom payment notes..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => setCustomPaymentNote(false)}
              className="text-xs text-gray-500 hover:text-gray-700 self-start mt-2"
            >
              Templates
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {paymentNotes.map(note => (
              <button
                key={note.id}
                type="button"
                onClick={() => updatePlan({ payment_notes: note.text })}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  plan.payment_notes === note.text
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {note.text}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomPaymentNote(true)}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              + Custom note
            </button>
          </div>
        )}
      </div>

      {/* Continue to Review/Sign */}
      {plan.id && (
        <div className="pt-4">
          <Link
            href={`/plans/${plan.id}/review`}
            className="w-full block text-center bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-dark transition-colors"
          >
            Continue to Review & Sign
          </Link>
        </div>
      )}
    </div>
  )
}

// Helper to check if a line item has selections data
function hasSelections(item: { selections: Record<string, string> | null; options: Record<string, unknown> | null }): boolean {
  if (item.selections && Object.values(item.selections).some(v => v)) return true
  if (item.options && Object.entries(item.options).some(([k, v]) => {
    if (k.endsWith('_id') || k === 'option_id') return false
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v > 0
    if (typeof v === 'string') return !!v
    return false
  })) return true
  return false
}
