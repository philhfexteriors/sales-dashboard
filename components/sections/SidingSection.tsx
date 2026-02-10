'use client'

import { useEffect, useState } from 'react'
import { usePlanForm } from '@/components/PlanFormProvider'
import SectionField, { CustomLineItems } from './SectionField'
import CascadeSelect from '@/components/fields/CascadeSelect'
import CheckboxGroup from '@/components/fields/CheckboxGroup'
import CountInput from '@/components/fields/CountInput'

interface Category { id: string; name: string; section: string }

export default function SidingSection() {
  const { getLineItem, updateLineItem } = usePlanForm()
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch('/api/products/categories')
      .then(r => r.json())
      .then(data => setCategories((data || []).filter((c: Category) => c.section === 'siding')))
  }, [])

  const getCategoryId = (name: string) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id

  const sidingCatId = getCategoryId('siding')
  const fasciaCatId = getCategoryId('fascia')
  const soffitCatId = getCategoryId('soffit')

  // Siding specs - get the selected color for "Match" feature
  const sidingSpecs = getLineItem('siding_specs', 'siding')
  const sidingColor = (sidingSpecs?.selections as Record<string, string>)?.color || ''

  // Underlay
  const underlay = getLineItem('underlay', 'siding')
  const underlayOpts = (underlay?.options || {}) as Record<string, boolean>
  const selectedUnderlay = Object.entries(underlayOpts).filter(([, v]) => v).map(([k]) => k)

  // Helper for block color with "Match" feature
  function BlockField({ fieldKey, label }: { fieldKey: string; label: string }) {
    const item = getLineItem(fieldKey, 'siding')
    const opts = (item?.options || {}) as Record<string, unknown>
    const isMatch = opts.color_match === true

    return (
      <SectionField section="siding" fieldKey={fieldKey} label={label}>
        <div className="flex flex-wrap items-end gap-4">
          <CountInput
            value={(opts.count as number) || 0}
            onChange={val => updateLineItem(fieldKey, 'siding', {
              options: { ...opts, count: val }
            })}
            label="Count"
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateLineItem(fieldKey, 'siding', {
                  options: { ...opts, color_match: !isMatch, color: isMatch ? '' : sidingColor }
                })}
                className={`px-3 py-2.5 rounded-lg text-sm border ${
                  isMatch ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'
                }`}
              >
                Match Siding
              </button>
              {!isMatch && (
                <input
                  type="text"
                  value={(opts.color as string) || ''}
                  onChange={e => updateLineItem(fieldKey, 'siding', {
                    options: { ...opts, color: e.target.value }
                  })}
                  placeholder="Color"
                  className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>
          </div>
        </div>
      </SectionField>
    )
  }

  // Corner helper
  function CornerField({ fieldKey, label }: { fieldKey: string; label: string }) {
    const item = getLineItem(fieldKey, 'siding')
    const opts = (item?.options || {}) as Record<string, unknown>
    return (
      <SectionField section="siding" fieldKey={fieldKey} label={label}>
        <div className="flex flex-wrap gap-4">
          <CountInput
            value={(opts.count as number) || 0}
            onChange={val => updateLineItem(fieldKey, 'siding', { options: { ...opts, count: val } })}
            label="Count"
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <input
              type="text"
              value={(opts.color as string) || ''}
              onChange={e => updateLineItem(fieldKey, 'siding', { options: { ...opts, color: e.target.value } })}
              placeholder="Color"
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SectionField>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Siding</h2>
        <p className="text-sm text-gray-500">Configure siding, fascia, soffit, and related items.</p>
      </div>

      {/* Siding Specs */}
      <SectionField section="siding" fieldKey="siding_specs" label="Siding Specs">
        {sidingCatId ? (
          <CascadeSelect
            categoryId={sidingCatId}
            value={(sidingSpecs?.selections || {}) as Record<string, string>}
            onChange={val => updateLineItem('siding_specs', 'siding', { selections: val })}
            labels={['Brand', 'Line', 'Color']}
          />
        ) : (
          <p className="text-sm text-gray-400">Set up Siding category in admin</p>
        )}
      </SectionField>

      {/* Corners */}
      <CornerField fieldKey="corners_inner" label="Corner Color - Inner" />
      <CornerField fieldKey="corners_outer" label="Corner Color - Outer" />
      <CornerField fieldKey="corners_bay" label="Corner Color - Bay" />

      {/* J-Channel */}
      <SectionField section="siding" fieldKey="j_channel" label="J-Channel">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
          <input
            type="text"
            value={(getLineItem('j_channel', 'siding')?.options as Record<string, string>)?.color || ''}
            onChange={e => updateLineItem('j_channel', 'siding', { options: { color: e.target.value } })}
            placeholder="J-Channel color"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </SectionField>

      {/* Underlay */}
      <SectionField section="siding" fieldKey="underlay" label="Underlay">
        <CheckboxGroup
          options={[
            { value: 'wrap', label: 'Wrap' },
            { value: 'fanfold', label: 'Fanfold' },
          ]}
          selected={selectedUnderlay}
          onChange={vals => {
            const opts: Record<string, boolean> = {}
            vals.forEach(v => opts[v] = true)
            updateLineItem('underlay', 'siding', { options: opts })
          }}
        />
      </SectionField>

      {/* Blocks */}
      <BlockField fieldKey="split_blocks" label="Split Blocks" />
      <BlockField fieldKey="light_blocks" label="Light Blocks" />
      <BlockField fieldKey="exhaust" label="Exhaust" />

      {/* Gable Vents */}
      <SectionField section="siding" fieldKey="gable_vents" label="Gable Vents">
        <div className="flex flex-wrap gap-4">
          <CountInput
            value={((getLineItem('gable_vents', 'siding')?.options as Record<string, number>)?.count) || 0}
            onChange={val => {
              const opts = (getLineItem('gable_vents', 'siding')?.options || {}) as Record<string, unknown>
              updateLineItem('gable_vents', 'siding', { options: { ...opts, count: val } })
            }}
            label="Count"
          />
          {['color', 'shape', 'size'].map(field => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{field}</label>
              <input
                type="text"
                value={((getLineItem('gable_vents', 'siding')?.options as Record<string, string>)?.[field]) || ''}
                onChange={e => {
                  const opts = (getLineItem('gable_vents', 'siding')?.options || {}) as Record<string, unknown>
                  updateLineItem('gable_vents', 'siding', { options: { ...opts, [field]: e.target.value } })
                }}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      </SectionField>

      {/* Fascia */}
      <SectionField section="siding" fieldKey="fascia" label="Fascia">
        {fasciaCatId ? (
          <CascadeSelect
            categoryId={fasciaCatId}
            value={(getLineItem('fascia', 'siding')?.selections || {}) as Record<string, string>}
            onChange={val => updateLineItem('fascia', 'siding', { selections: val })}
            labels={['Brand', 'Color', 'Size']}
          />
        ) : (
          <p className="text-sm text-gray-400">Set up Fascia category in admin</p>
        )}
      </SectionField>

      {/* Soffit */}
      <SectionField section="siding" fieldKey="soffit" label="Soffit">
        {soffitCatId ? (
          <CascadeSelect
            categoryId={soffitCatId}
            value={(getLineItem('soffit', 'siding')?.selections || {}) as Record<string, string>}
            onChange={val => updateLineItem('soffit', 'siding', { selections: val })}
            labels={['Brand', 'Color', 'Type']}
          />
        ) : (
          <p className="text-sm text-gray-400">Set up Soffit category in admin</p>
        )}
      </SectionField>

      {/* Extra Line Items */}
      <h3 className="font-medium text-gray-700 mt-6">Additional Items</h3>
      <CustomLineItems section="siding" />
    </div>
  )
}
