'use client'

import { usePlanForm, type LineItem } from '@/components/PlanFormProvider'
import CurrencyInput from '@/components/fields/CurrencyInput'

interface SectionFieldProps {
  section: string
  fieldKey: string
  label: string
  children: React.ReactNode
}

export default function SectionField({ section, fieldKey, label, children }: SectionFieldProps) {
  const { getLineItem, updateLineItem } = usePlanForm()
  const item = getLineItem(fieldKey, section)
  const amount = item?.amount || 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-medium text-gray-900">{label}</h3>
        <CurrencyInput
          value={amount}
          onChange={val => updateLineItem(fieldKey, section, { amount: val })}
          className="w-32 shrink-0"
        />
      </div>
      {children}
    </div>
  )
}

export function CustomLineItems({ section }: { section: string }) {
  const { lineItems, addCustomLineItem, removeLineItem, updateLineItem } = usePlanForm()

  const customItems = lineItems.filter(
    li => li.section === section && li.field_key.includes('custom_')
  )

  return (
    <div className="space-y-3">
      {customItems.map(item => (
        <div key={item.field_key} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={item.description || ''}
              onChange={e => updateLineItem(item.field_key, section, { description: e.target.value })}
              placeholder="Description..."
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <CurrencyInput
              value={item.amount}
              onChange={val => updateLineItem(item.field_key, section, { amount: val })}
              className="w-32 shrink-0"
            />
            <button
              onClick={() => removeLineItem(item.field_key, section)}
              className="text-gray-400 hover:text-red-500 p-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => addCustomLineItem(section)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:text-primary hover:border-primary transition-colors"
      >
        + Add Line Item
      </button>
    </div>
  )
}
