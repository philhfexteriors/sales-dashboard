'use client'

import { useEffect, useState } from 'react'
import { usePlanForm } from '@/components/PlanFormProvider'
import CascadeSelect from './CascadeSelect'
import ManagedSelect from './ManagedSelect'
import RadioGroup from './RadioGroup'
import CheckboxGroup from './CheckboxGroup'
import CountInput from './CountInput'
import CurrencyInput from './CurrencyInput'

export interface CategoryField {
  id: string
  section: string
  name: string
  field_key: string
  field_type: string // 'cascade' | 'select' | 'radio' | 'checkbox' | 'count' | 'text'
  cascade_levels: number
  level_labels: string[] | null
  allow_custom: boolean
  allow_deselect: boolean
  config: {
    sub_fields?: SubField[]
    linked_to?: string
    match_from?: string
  } | null
  sort_order: number
  active: boolean
}

interface SubField {
  key: string
  type: string // 'text' | 'number' | 'select' | 'cascade' | 'radio' | 'count'
  label: string
  show_when?: Record<string, string | boolean>
}

interface ProductOption {
  id: string
  name: string
  notes: string | null
  active: boolean
}

interface DynamicFieldProps {
  category: CategoryField
  section: string
}

export default function DynamicField({ category, section }: DynamicFieldProps) {
  const { getLineItem, updateLineItem } = usePlanForm()
  const [fieldOptions, setFieldOptions] = useState<ProductOption[]>([])

  const item = getLineItem(category.field_key, section)
  const amount = item?.amount || 0
  const options = (item?.options || {}) as Record<string, unknown>
  const selections = (item?.selections || {}) as Record<string, string>

  // Fetch product_options for this category (for radio, checkbox, select types)
  useEffect(() => {
    if (['radio', 'checkbox'].includes(category.field_type)) {
      // Filter out sub-field options (those with notes starting with 'sub:')
      fetch(`/api/products/options?category_id=${category.id}&active=true`)
        .then(r => r.json())
        .then((data: ProductOption[]) => {
          setFieldOptions((data || []).filter(o => !o.notes?.startsWith('sub:')))
        })
    }
  }, [category.id, category.field_type])

  // Check if sub-field should be shown based on show_when
  function shouldShowSubField(sf: SubField): boolean {
    if (!sf.show_when) return true

    if (sf.show_when.count === '>0') {
      return ((options.count as number) || 0) > 0
    }
    if (sf.show_when.has_selection === true) {
      // Show when any checkbox/radio option is selected
      if (category.field_type === 'checkbox') {
        const selected = Object.entries(options).filter(([k, v]) => v === true && k !== 'product' && k !== 'product_id')
        return selected.length > 0
      }
      if (category.field_type === 'radio') {
        return !!options.value
      }
    }
    return true
  }

  // Render the primary field based on field_type
  function renderPrimaryField() {
    switch (category.field_type) {
      case 'cascade':
        return (
          <CascadeSelect
            categoryId={category.id}
            value={selections}
            onChange={val => updateLineItem(category.field_key, section, { selections: val })}
            labels={(category.level_labels as [string, string, string]) || ['Brand', 'Line', 'Color']}
            levels={category.cascade_levels}
          />
        )

      case 'select':
        // Special case: warranty linked to shingle line
        if (category.config?.linked_to === 'shingle_line') {
          return <WarrantyField category={category} section={section} />
        }
        return (
          <ManagedSelect
            categoryId={category.id}
            value={(options.type as string) || ''}
            onChange={(val, optId) => updateLineItem(category.field_key, section, {
              options: { ...options, type: val, option_id: optId },
              description: val,
            })}
            placeholder={`Select ${category.name.toLowerCase()}...`}
            allowCustom={category.allow_custom}
          />
        )

      case 'radio':
        return (
          <RadioGroup
            options={fieldOptions.map(o => ({ value: o.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: o.name }))}
            selected={(options.value as string) || null}
            onChange={val => updateLineItem(category.field_key, section, {
              options: { ...options, value: val },
            })}
            allowDeselect={category.allow_deselect}
          />
        )

      case 'checkbox': {
        const selectedKeys = Object.entries(options)
          .filter(([k, v]) => v === true && !k.startsWith('product') && k !== 'color')
          .map(([k]) => k)
        return (
          <CheckboxGroup
            options={fieldOptions.map(o => ({ value: o.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: o.name }))}
            selected={selectedKeys}
            onChange={vals => {
              const newOpts: Record<string, unknown> = {}
              // Preserve non-checkbox options (product, color, etc.)
              Object.entries(options).forEach(([k, v]) => {
                if (k === 'product' || k === 'product_id' || k === 'color') {
                  newOpts[k] = v
                }
              })
              vals.forEach(v => newOpts[v] = true)
              updateLineItem(category.field_key, section, { options: newOpts })
            }}
          />
        )
      }

      case 'count':
        return (
          <CountInput
            value={(options.count as number) || 0}
            onChange={val => updateLineItem(category.field_key, section, {
              options: { ...options, count: val },
            })}
            label="Count"
          />
        )

      case 'text':
        return (
          <input
            type="text"
            value={item?.description || ''}
            onChange={e => updateLineItem(category.field_key, section, {
              description: e.target.value,
            })}
            placeholder={`${category.name} details...`}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        )

      default:
        return <p className="text-sm text-gray-400">Unknown field type: {category.field_type}</p>
    }
  }

  // Render sub-fields (composite fields)
  function renderSubFields() {
    if (!category.config?.sub_fields) return null

    return category.config.sub_fields.map(sf => {
      if (!shouldShowSubField(sf)) return null

      return (
        <div key={sf.key}>
          {renderSubField(sf)}
        </div>
      )
    })
  }

  function renderSubField(sf: SubField) {
    switch (sf.type) {
      case 'text':
        return (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{sf.label}</label>
            <MatchableTextInput
              category={category}
              section={section}
              subFieldKey={sf.key}
              label={sf.label}
            />
          </div>
        )

      case 'number':
        return (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{sf.label}</label>
            <input
              type="number"
              inputMode="numeric"
              value={(options[sf.key] as number) || ''}
              onChange={e => updateLineItem(category.field_key, section, {
                options: { ...options, [sf.key]: parseInt(e.target.value) || 0 },
              })}
              placeholder="0"
              className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )

      case 'select':
        return (
          <ManagedSelect
            categoryId={category.id}
            value={(options[sf.key] as string) || ''}
            onChange={(val, optId) => updateLineItem(category.field_key, section, {
              options: { ...options, [sf.key]: val, [`${sf.key}_id`]: optId },
            })}
            placeholder={`Select ${sf.label.toLowerCase()}...`}
            label={sf.label}
            allowCustom
          />
        )

      case 'cascade':
        return (
          <CascadeSelect
            categoryId={category.id}
            value={(item?.selections || {}) as Record<string, string>}
            onChange={val => updateLineItem(category.field_key, section, { selections: val })}
            labels={(category.level_labels as [string, string, string]) || ['Brand', 'Model', '']}
            levels={category.cascade_levels}
          />
        )

      case 'radio': {
        return <SubFieldRadio category={category} section={section} subFieldKey={sf.key} label={sf.label} />
      }

      case 'count':
        return (
          <CountInput
            value={(options[sf.key] as number) || 0}
            onChange={val => updateLineItem(category.field_key, section, {
              options: { ...options, [sf.key]: val },
            })}
            label={sf.label}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-medium text-gray-900">{category.name}</h3>
        <CurrencyInput
          value={amount}
          onChange={val => updateLineItem(category.field_key, section, { amount: val })}
          className="w-32 shrink-0"
        />
      </div>
      <div className="space-y-3">
        {renderPrimaryField()}
        {renderSubFields()}
      </div>
    </div>
  )
}

// Sub-component: RadioGroup that gets options from product_options with sub:key notes
function SubFieldRadio({
  category,
  section,
  subFieldKey,
  label,
}: {
  category: CategoryField
  section: string
  subFieldKey: string
  label: string
}) {
  const { getLineItem, updateLineItem } = usePlanForm()
  const [subOptions, setSubOptions] = useState<ProductOption[]>([])

  const item = getLineItem(category.field_key, section)
  const options = (item?.options || {}) as Record<string, unknown>

  useEffect(() => {
    fetch(`/api/products/options?category_id=${category.id}&active=true`)
      .then(r => r.json())
      .then((data: ProductOption[]) => {
        setSubOptions((data || []).filter(o => o.notes === `sub:${subFieldKey}`))
      })
  }, [category.id, subFieldKey])

  if (subOptions.length === 0) return null

  return (
    <RadioGroup
      options={subOptions.map(o => ({ value: o.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: o.name }))}
      selected={(options[subFieldKey] as string) || null}
      onChange={val => updateLineItem(category.field_key, section, {
        options: { ...options, [subFieldKey]: val },
      })}
      label={label}
    />
  )
}

// Sub-component: Text input with optional "Match Siding" feature
function MatchableTextInput({
  category,
  section,
  subFieldKey,
  label,
}: {
  category: CategoryField
  section: string
  subFieldKey: string
  label: string
}) {
  const { getLineItem, updateLineItem } = usePlanForm()

  const item = getLineItem(category.field_key, section)
  const options = (item?.options || {}) as Record<string, unknown>

  // Check if this field has match_from config (e.g., "siding_specs.color")
  const matchFrom = category.config?.match_from
  const matchParts = matchFrom ? matchFrom.split('.') : [null, null]
  const matchFieldKey = matchParts[0]
  const matchProperty = matchParts[1]
  const matchItem = matchFieldKey ? getLineItem(matchFieldKey, section) : null
  const matchValue = matchItem && matchProperty
    ? ((matchItem.selections as Record<string, string>)?.[matchProperty] || '')
    : ''

  const isMatch = options.color_match === true

  if (!matchFrom) {
    // Simple text input
    return (
      <input
        type="text"
        value={(options[subFieldKey] as string) || ''}
        onChange={e => updateLineItem(category.field_key, section, {
          options: { ...options, [subFieldKey]: e.target.value },
        })}
        placeholder={label}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    )
  }

  // Text input with "Match" button
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => updateLineItem(category.field_key, section, {
          options: { ...options, color_match: !isMatch, [subFieldKey]: isMatch ? '' : matchValue },
        })}
        className={`px-3 py-2.5 rounded-lg text-sm border whitespace-nowrap ${
          isMatch ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'
        }`}
      >
        Match Siding
      </button>
      {!isMatch && (
        <input
          type="text"
          value={(options[subFieldKey] as string) || ''}
          onChange={e => updateLineItem(category.field_key, section, {
            options: { ...options, [subFieldKey]: e.target.value },
          })}
          placeholder={label}
          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      )}
    </div>
  )
}

// Special warranty field that depends on shingle line selection
function WarrantyField({
  category,
  section,
}: {
  category: CategoryField
  section: string
}) {
  const { getLineItem, updateLineItem } = usePlanForm()
  const [warrantyTiers, setWarrantyTiers] = useState<{ id: string; name: string }[]>([])

  const item = getLineItem(category.field_key, section)
  const options = (item?.options || {}) as Record<string, unknown>
  const warrantyValue = (options.tier as string) || ''

  // Get shingle line ID from shingles line item
  const shingles = getLineItem('shingles', section)
  const shingleLineId = (shingles?.selections as Record<string, string>)?.line_id || null

  useEffect(() => {
    if (!shingleLineId) {
      setWarrantyTiers([])
      return
    }
    fetch(`/api/warranty-tiers?shingle_line_id=${shingleLineId}`)
      .then(r => r.json())
      .then(data => setWarrantyTiers(data || []))
  }, [shingleLineId])

  if (shingleLineId && warrantyTiers.length > 0) {
    return (
      <select
        value={warrantyValue}
        onChange={e => updateLineItem(category.field_key, section, {
          options: { tier: e.target.value, tier_id: warrantyTiers.find(t => t.name === e.target.value)?.id },
          description: e.target.value,
        })}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
      >
        <option value="">Select warranty tier...</option>
        {warrantyTiers.map(t => (
          <option key={t.id} value={t.name}>{t.name}</option>
        ))}
      </select>
    )
  }

  return (
    <div>
      {!shingleLineId && (
        <p className="text-xs text-gray-400 mb-2">Select a shingle line above to see warranty options</p>
      )}
      <input
        type="text"
        value={item?.description || ''}
        onChange={e => updateLineItem(category.field_key, section, { description: e.target.value })}
        placeholder="Warranty details..."
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  )
}
