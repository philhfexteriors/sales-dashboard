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
  sale_price: number | null
  insurance_proceeds: number | null
  down_payment: number | null
  out_of_pocket: number | null
  payment_notes: string | null
}

interface LineItem {
  section: string
  field_key: string
  selections: Record<string, string> | null
  options: Record<string, unknown> | null
  description: string | null
  amount: number
}

export default function ReviewPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/plans/${id}`)
      .then(r => r.json())
      .then(data => {
        setPlan(data.plan)
        setLineItems(data.lineItems)
        setLoading(false)
      })
  }, [id])

  if (loading || !plan) {
    return <AppShell><div className="py-20"><Loading message="Loading review..." size="lg" /></div></AppShell>
  }

  // For line item amounts — hide $0.00, show blank
  const fmt = (val: number | null) =>
    val != null && val > 0 ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''

  // For totals — always show value
  const fmtTotal = (val: number | null) =>
    val != null ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'

  // Show items with ANY data — selections, options, description, or amount
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

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Review Production Plan</h1>

        {/* Client Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Client Information</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{plan.client_name || '-'}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{plan.client_phone || '-'}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{[plan.client_address, plan.client_city, plan.client_state, plan.client_zip].filter(Boolean).join(', ') || '-'}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{plan.client_email || '-'}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="font-medium">{[plan.is_retail && 'Retail', plan.is_insurance && 'Insurance'].filter(Boolean).join(' + ') || '-'}</span></div>
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

        {/* Totals */}
        <div className="bg-white rounded-lg border-2 border-primary/20 p-5 mb-6 space-y-2">
          <div className="flex justify-between text-lg font-semibold">
            <span>Sale Price</span>
            <span className="text-primary">{fmtTotal(plan.sale_price)}</span>
          </div>
          {plan.is_insurance && plan.insurance_proceeds != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Insurance Proceeds</span>
              <span>{fmtTotal(plan.insurance_proceeds)}</span>
            </div>
          )}
          {plan.is_retail && plan.down_payment != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Down Payment</span>
              <span>{fmtTotal(plan.down_payment)}</span>
            </div>
          )}
          {plan.out_of_pocket != null && (
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span>Homeowner Out-of-pocket</span>
              <span className="text-primary">{fmtTotal(plan.out_of_pocket)}</span>
            </div>
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
            Edit Plan
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
