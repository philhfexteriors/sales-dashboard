'use client'

import { useEffect, useState } from 'react'

interface Option {
  id: string
  name: string
  active: boolean
}

interface ManagedSelectProps {
  categoryId?: string
  parentId?: string
  value: string
  onChange: (value: string, optionId?: string) => void
  label?: string
  placeholder?: string
  allowCustom?: boolean
}

export default function ManagedSelect({
  categoryId,
  parentId,
  value,
  onChange,
  label,
  placeholder = 'Select...',
  allowCustom = false,
}: ManagedSelectProps) {
  const [options, setOptions] = useState<Option[]>([])
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    if (!categoryId && !parentId) return
    const params = new URLSearchParams()
    if (categoryId) params.set('category_id', categoryId)
    if (parentId) params.set('parent_id', parentId)

    fetch(`/api/products/options?${params}`)
      .then(r => r.json())
      .then(data => setOptions((data || []).filter((o: Option) => o.active)))
  }, [categoryId, parentId])

  if (showCustom) {
    return (
      <div>
        {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Custom value"
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => {
          if (e.target.value === '__custom__') {
            setShowCustom(true)
            onChange('')
            return
          }
          const opt = options.find(o => o.name === e.target.value)
          onChange(e.target.value, opt?.id)
        }}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={o.name}>{o.name}</option>
        ))}
        {allowCustom && <option value="__custom__">Custom...</option>}
      </select>
    </div>
  )
}
