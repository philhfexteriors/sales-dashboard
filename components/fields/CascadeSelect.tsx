'use client'

import { useEffect, useState } from 'react'

interface Option {
  id: string
  name: string
  active: boolean
}

interface CascadeSelectProps {
  categoryId: string
  value: { brand?: string; line?: string; color?: string; brand_id?: string; line_id?: string; color_id?: string }
  onChange: (value: { brand?: string; line?: string; color?: string; brand_id?: string; line_id?: string; color_id?: string }) => void
  labels?: [string, string, string]
  levels?: number
}

export default function CascadeSelect({
  categoryId,
  value,
  onChange,
  labels = ['Brand', 'Line', 'Color'],
  levels = 3,
}: CascadeSelectProps) {
  const [brands, setBrands] = useState<Option[]>([])
  const [lines, setLines] = useState<Option[]>([])
  const [colors, setColors] = useState<Option[]>([])

  // Fetch brands (level 0)
  useEffect(() => {
    if (!categoryId) return
    fetch(`/api/products/options?category_id=${categoryId}&parent_id=&active=true`)
      .then(r => r.json())
      .then(data => setBrands(data || []))
  }, [categoryId])

  // Fetch lines when brand changes
  useEffect(() => {
    if (!value.brand_id) { setLines([]); return }
    fetch(`/api/products/options?parent_id=${value.brand_id}&active=true`)
      .then(r => r.json())
      .then(data => setLines(data || []))
  }, [value.brand_id])

  // Fetch colors when line changes
  useEffect(() => {
    if (!value.line_id || levels < 3) { setColors([]); return }
    fetch(`/api/products/options?parent_id=${value.line_id}&active=true`)
      .then(r => r.json())
      .then(data => setColors(data || []))
  }, [value.line_id, levels])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{labels[0]}</label>
        <select
          value={value.brand_id || ''}
          onChange={e => {
            const opt = brands.find(b => b.id === e.target.value)
            onChange({
              brand: opt?.name,
              brand_id: opt?.id,
              line: undefined,
              line_id: undefined,
              color: undefined,
              color_id: undefined,
            })
          }}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        >
          <option value="">Select {labels[0]}</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {levels >= 2 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{labels[1]}</label>
          <select
            value={value.line_id || ''}
            onChange={e => {
              const opt = lines.find(l => l.id === e.target.value)
              onChange({
                ...value,
                line: opt?.name,
                line_id: opt?.id,
                color: undefined,
                color_id: undefined,
              })
            }}
            disabled={!value.brand_id}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">Select {labels[1]}</option>
            {lines.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {levels >= 3 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{labels[2]}</label>
          <select
            value={value.color_id || ''}
            onChange={e => {
              const opt = colors.find(c => c.id === e.target.value)
              onChange({
                ...value,
                color: opt?.name,
                color_id: opt?.id,
              })
            }}
            disabled={!value.line_id}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">Select {labels[2]}</option>
            {colors.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
