'use client'

import { use, useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import Link from 'next/link'

interface Plan {
  id: string
  status: string
  client_name: string
  client_address: string
  client_city: string
  client_state: string
  client_zip: string
  client_phone: string
  client_email: string
  is_retail: boolean
  is_insurance: boolean
  has_roof: boolean
  has_siding: boolean
  has_guttering: boolean
  has_windows: boolean
  has_small_jobs: boolean
  sale_price: number | null
  insurance_proceeds: number | null
  down_payment: number | null
  out_of_pocket: number | null
  payment_notes: string | null
  discount_value: number | null
  discount_type: string | null
  start_date_window_id: string | null
  approx_start_date: string | null
}

interface LineItem {
  section: string
  field_key: string
  selections: Record<string, string> | null
  options: Record<string, unknown> | null
  description: string | null
  amount: number
}

interface StartDateWindow {
  id: string
  label: string
}

export default function ReviewPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [startDates, setStartDates] = useState<StartDateWindow[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/plans/${id}`).then(r => r.json()),
      fetch('/api/start-dates').then(r => r.json()),
    ]).then(([planData, sdData]) => {
      setPlan(planData.plan)
      setLineItems(planData.lineItems)
      setStartDates(sdData || [])
      setLoading(false)
    })
  }, [id])

  if (loading || !plan) {
    return <AppShell><div className="py-20"><Loading message="Loading review..." size="lg" /></div></AppShell>
  }

  const fmt = (val: number | null) =>
    val != null && val > 0 ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''

  const fmtTotal = (val: number | null) =>
    val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'

  const hasItemData = (li: LineItem): boolean => {
    if (li.amount > 0) return true
    if (li.description) return true
    if (li.selections && Object.values(li.selections).some(v => v)) return true
    if (li.options) {
      for (const [k, v] of Object.entries(li.options)) {
        if (k.endsWith('_id') || k === 'option_id') continue
        if (typeof v === 'boolean' && v) return true
        if (typeof v === 'string' && v) return true
        if (typeof v === 'number' && v > 0) return true
      }
    }
    return false
  }

  const sections = ['roof', 'siding', 'guttering', 'windows', 'small_jobs', 'misc']
  const grouped = sections.map(s => ({
    section: s,
    items: lineItems.filter(li => li.section === s && hasItemData(li)),
  })).filter(g => g.items.length > 0)

  // Discount calc
  const salePrice = plan.sale_price || 0
  const discountValue = plan.discount_value || 0
  const discountType = plan.discount_type || 'dollar'
  const discountAmount = discountType === 'percent'
    ? Math.round(salePrice * (discountValue / 100) * 100) / 100
    : discountValue
  const salePriceAfterDiscount = Math.round(Math.max(0, salePrice - discountAmount) * 100) / 100

  // Find start date label
  const startDateLabel = startDates.find(d => d.id === plan.start_date_window_id)?.label

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Back button at top */}
        <Link
          href={`/plans/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium mb-4"
        >
          ← Back to Pricing & Review
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Production Plan</h1>

        {/* Client Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Client Information</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{plan.client_name || '-'}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{plan.client_phone || '-'}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{[plan.client_address, plan.client_city, plan.client_state, plan.client_zip].filter(Boolean).join(', ') || '-'}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{plan.client_email || '-'}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="font-medium">{[plan.is_retail && 'Retail', plan.is_insurance && 'Insurance'].filter(Boolean).join(' + ') || '-'}</span></div>
            {startDateLabel && (
              <div><span className="text-gray-500">Approx. Start:</span> <span className="font-medium">{startDateLabel}</span></div>
            )}
          </div>
        </div>

        {/* Sections Selected */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Work Scope</h2>
          <div className="flex flex-wrap gap-2">
            {plan.has_roof && <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">Roof</span>}
            {plan.has_siding && <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">Siding</span>}
            {plan.has_guttering && <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">Guttering</span>}
            {plan.has_windows && <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">Windows</span>}
            {plan.has_small_jobs && <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">Small Jobs</span>}
          </div>
        </div>

        {/* Line Items */}
        {grouped.map(group => (
          <div key={group.section} className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 capitalize">{group.section.replace('_', ' ')}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {group.items.map(item => (
                <div key={`${item.section}-${item.field_key}`} className="flex justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{item.field_key.replace(/_/g, ' ')}</p>
                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                    {item.selections && (
                      <p className="text-xs text-gray-500">
                        {Object.entries(item.selections).filter(([k]) => !k.endsWith('_id')).map(([, v]) => v).filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <span className={`font-medium ${item.amount > 0 ? '' : 'text-gray-300'}`}>
                    {fmt(item.amount) || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Payment Terms */}
        <div className="bg-white rounded-lg border-2 border-primary/20 p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-gray-900 text-lg mb-2">Payment Terms</h2>

          <div className="flex justify-between text-lg font-semibold">
            <span>Sale Price</span>
            <span className="text-primary">{fmtTotal(plan.sale_price)}</span>
          </div>

          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Discount {discountType === 'percent' ? `(${discountValue}%)` : ''}
                </span>
                <span className="text-red-500">-{fmtTotal(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-1 border-t">
                <span>Total After Discount</span>
                <span className="text-primary">{fmtTotal(salePriceAfterDiscount)}</span>
              </div>
            </>
          )}

          {/* Retail pricing */}
          {plan.is_retail && !plan.is_insurance && (
            <>
              {plan.down_payment != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Down Payment</span>
                  <span>{fmtTotal(plan.down_payment)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Amount Due Upon Completion</span>
                <span className="text-primary">
                  {fmtTotal(Math.round(Math.max(0, salePriceAfterDiscount - (plan.down_payment || 0)) * 100) / 100)}
                </span>
              </div>
            </>
          )}

          {/* Insurance pricing */}
          {plan.is_insurance && !plan.is_retail && (
            <>
              {plan.insurance_proceeds != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Owner To General (out-of-pocket)</span>
                  <span>{fmtTotal(plan.insurance_proceeds)}</span>
                </div>
              )}
              {plan.down_payment != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Down Payment</span>
                  <span>{fmtTotal(plan.down_payment)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Amount Due Upon Completion</span>
                <span className="text-primary">
                  {fmtTotal(Math.round(Math.max(0, salePriceAfterDiscount - (plan.insurance_proceeds || 0) - (plan.down_payment || 0)) * 100) / 100)}
                </span>
              </div>
            </>
          )}

          {/* Both retail and insurance */}
          {plan.is_retail && plan.is_insurance && (
            <>
              {plan.insurance_proceeds != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Insurance Proceeds / Owner To General</span>
                  <span>{fmtTotal(plan.insurance_proceeds)}</span>
                </div>
              )}
              {plan.down_payment != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Down Payment</span>
                  <span>{fmtTotal(plan.down_payment)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Amount Due Upon Completion</span>
                <span className="text-primary">
                  {fmtTotal(Math.round(Math.max(0, salePriceAfterDiscount - (plan.insurance_proceeds || 0) - (plan.down_payment || 0)) * 100) / 100)}
                </span>
              </div>
            </>
          )}

          {plan.payment_notes && (
            <div className="pt-2 border-t text-sm text-gray-600">
              <span className="font-medium">Payment Notes:</span> {plan.payment_notes}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/plans/${id}/edit`}
            className="flex-1 text-center py-4 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Plan
            </span>
          </Link>
          <Link
            href={`/plans/${id}/sign`}
            className="flex-1 text-center py-4 rounded-xl font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            Proceed to Signature
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
