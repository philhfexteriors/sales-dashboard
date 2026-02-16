'use client'

import { useState, useEffect } from 'react'

interface Variant {
  id: string
  name: string
  variant_group: string
  sort_order: number
  active: boolean
}

interface VariantSelectProps {
  priceListId: string
  value: string | null | undefined
  onChange: (variantId: string | null) => void
  className?: string
}

export default function VariantSelect({ priceListId, value, onChange, className }: VariantSelectProps) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!priceListId) {
      setVariants([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/price-list/variants?price_list_id=${priceListId}`)
      .then(r => r.json())
      .then(data => {
        setVariants(Array.isArray(data) ? data.filter((v: Variant) => v.active) : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [priceListId])

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-gray-400 ${className || ''}`}>
        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400" />
        Loading...
      </div>
    )
  }

  if (variants.length === 0) return null

  // Group variants by variant_group
  const groups = variants.reduce<Record<string, Variant[]>>((acc, v) => {
    const group = v.variant_group || 'color'
    if (!acc[group]) acc[group] = []
    acc[group].push(v)
    return acc
  }, {})

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {Object.entries(groups).map(([group, groupVariants]) => (
        <div key={group} className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 capitalize">{group}:</label>
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value || null)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
          >
            <option value="">Select {group}...</option>
            {groupVariants.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
