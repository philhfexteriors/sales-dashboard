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
  const [insuranceProceedsEditing, setInsuranceProceedsEditing] = useState(false)
  const hasSetDefaultDownPayment = useRef(false)

  // Discount state
  const [discountType, setDiscountType] = useState<'dollar' | 'percent'>('dollar')
  const [discountValue, setDiscountValue] = useState<number>(plan.discount_value || 0)

  // Sync discount from plan on load
  useEffect(() => {
    if (plan.discount_value) {
      setDiscountValue(plan.discount_value)
      setDiscountType(plan.discount_type === 'percent' ? 'percent' : 'dollar')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (!hasSetDefaultDownPayment.current && (plan.down_payment == null || plan.down_payment === 0)) {
      const defaultDown = Math.round(plan.sale_price * 0.6 * 100) / 100
      updatePlan({ down_payment: defaultDown })
      hasSetDefaultDownPayment.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.is_retail, plan.sale_price])

  // Save discount to plan whenever it changes
  useEffect(() => {
    updatePlan({ discount_value: discountValue, discount_type: discountType })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountValue, discountType])

  // Group line items by section
  const sections = ['roof', 'siding', 'guttering', 'windows', 'small_jobs', 'misc']
  const groupedItems = sections.map(section => ({
    section,
    items: lineItems.filter(li => li.section === section && (li.amount > 0 || li.description || hasSelections(li))),
  })).filter(g => g.items.length > 0)

  const formatMoney = (val: number | null) =>
    val != null && val > 0 ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''

  const formatMoneyOrDash = (val: number | null) =>
    val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'

  // Calculate discount amount
  const salePrice = plan.sale_price || 0
  const discountAmount = discountType === 'percent'
    ? Math.round(salePrice * (discountValue / 100) * 100) / 100
    : discountValue
  const salePriceAfterDiscount = Math.round(Math.max(0, salePrice - discountAmount) * 100) / 100

  // Calculate default 60% for display
  const defaultDownPayment = salePriceAfterDiscount ? Math.round(salePriceAfterDiscount * 0.6 * 100) / 100 : 0

  // Pencil icon SVG
  const PencilIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )

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
        {/* Sale Price */}
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold text-gray-900">Sale Price</span>
          <span className="font-bold text-primary">{formatMoneyOrDash(plan.sale_price)}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Discount</span>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setDiscountType('dollar')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  discountType === 'dollar'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                $
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  discountType === 'percent'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                %
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              step={discountType === 'percent' ? '1' : '0.01'}
              min="0"
              max={discountType === 'percent' ? '100' : undefined}
              value={discountValue || ''}
              onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {discountAmount > 0 && discountType === 'percent' && (
              <span className="text-sm text-gray-500">(-{formatMoneyOrDash(discountAmount)})</span>
            )}
          </div>
        </div>

        {/* Total after discount */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-lg pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total After Discount</span>
            <span className="font-bold text-primary">{formatMoneyOrDash(salePriceAfterDiscount)}</span>
          </div>
        )}

        {/* RETAIL: Sale Price, Down Payment, Amount Due Upon Completion */}
        {plan.is_retail && !plan.is_insurance && (
          <>
            <div className="pt-2 border-t border-gray-200 space-y-3">
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
                      className="text-primary hover:text-primary-dark"
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-lg font-semibold">
                <span className="text-gray-900">Amount Due Upon Completion</span>
                <span className="text-primary">
                  {formatMoneyOrDash(
                    Math.round(Math.max(0, salePriceAfterDiscount - (plan.down_payment || 0)) * 100) / 100
                  )}
                </span>
              </div>
            </div>
          </>
        )}

        {/* INSURANCE: Sale Price (RCV + Upgrades), Owner To General, Down Payment, Amount Due */}
        {plan.is_insurance && !plan.is_retail && (
          <>
            <div className="pt-2 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Owner To General (out-of-pocket)</span>
                {insuranceProceedsEditing ? (
                  <CurrencyInput
                    value={plan.insurance_proceeds || 0}
                    onChange={val => updatePlan({ insurance_proceeds: val })}
                    className="w-40"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{formatMoneyOrDash(plan.insurance_proceeds)}</span>
                    <button
                      type="button"
                      onClick={() => setInsuranceProceedsEditing(true)}
                      className="text-primary hover:text-primary-dark"
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </div>

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
                      className="text-primary hover:text-primary-dark"
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-lg font-semibold">
                <span className="text-gray-900">Amount Due Upon Completion</span>
                <span className="text-primary">
                  {formatMoneyOrDash(
                    Math.round(Math.max(0, salePriceAfterDiscount - (plan.insurance_proceeds || 0) - (plan.down_payment || 0)) * 100) / 100
                  )}
                </span>
              </div>
            </div>
          </>
        )}

        {/* BOTH retail and insurance */}
        {plan.is_retail && plan.is_insurance && (
          <>
            <div className="pt-2 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Insurance Proceeds / Owner To General</span>
                {insuranceProceedsEditing ? (
                  <CurrencyInput
                    value={plan.insurance_proceeds || 0}
                    onChange={val => updatePlan({ insurance_proceeds: val })}
                    className="w-40"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{formatMoneyOrDash(plan.insurance_proceeds)}</span>
                    <button
                      type="button"
                      onClick={() => setInsuranceProceedsEditing(true)}
                      className="text-primary hover:text-primary-dark"
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Down Payment</span>
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
                      className="text-primary hover:text-primary-dark"
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-lg font-semibold">
                <span className="text-gray-900">Amount Due Upon Completion</span>
                <span className="text-primary">
                  {formatMoneyOrDash(
                    Math.round(Math.max(0, salePriceAfterDiscount - (plan.insurance_proceeds || 0) - (plan.down_payment || 0)) * 100) / 100
                  )}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Neither retail nor insurance — just show sale price */}
        {!plan.is_retail && !plan.is_insurance && (
          <div className="text-sm text-gray-400 italic">Select a sale type on the Client Info step to see payment breakdown.</div>
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
