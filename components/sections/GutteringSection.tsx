'use client'

import { usePlanForm } from '@/components/PlanFormProvider'
import SectionField, { CustomLineItems } from './SectionField'
import RadioGroup from '@/components/fields/RadioGroup'

export default function GutteringSection() {
  const { getLineItem, updateLineItem } = usePlanForm()

  const gutters = getLineItem('gutters', 'guttering')
  const gutterOpts = (gutters?.options || {}) as Record<string, string>

  const guards = getLineItem('guards', 'guttering')
  const guardOpts = (guards?.options || {}) as Record<string, string>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Guttering</h2>
        <p className="text-sm text-gray-500">Configure gutters and gutter guards.</p>
      </div>

      {/* Gutters */}
      <SectionField section="guttering" fieldKey="gutters" label="Gutters">
        <div className="space-y-3">
          <RadioGroup
            options={[
              { value: '5', label: '5"' },
              { value: '6', label: '6"' },
            ]}
            selected={gutterOpts.size || null}
            onChange={val => updateLineItem('gutters', 'guttering', {
              options: { ...gutterOpts, size: val }
            })}
            label="Size"
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <input
              type="text"
              value={gutterOpts.color || ''}
              onChange={e => updateLineItem('gutters', 'guttering', {
                options: { ...gutterOpts, color: e.target.value }
              })}
              placeholder="Gutter color"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SectionField>

      {/* Guards */}
      <SectionField section="guttering" fieldKey="guards" label="Gutter Guards">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <input
              type="text"
              value={guardOpts.type || ''}
              onChange={e => updateLineItem('guards', 'guttering', {
                options: { ...guardOpts, type: e.target.value }
              })}
              placeholder="Guard type"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {gutterOpts.size && (
            <p className="text-xs text-gray-400">
              Size auto-matched to gutters: {gutterOpts.size}&quot;
            </p>
          )}
        </div>
      </SectionField>

      {/* Extra Line Items */}
      <h3 className="font-medium text-gray-700 mt-6">Additional Items</h3>
      <CustomLineItems section="guttering" />
    </div>
  )
}
