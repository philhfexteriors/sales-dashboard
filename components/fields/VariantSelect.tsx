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
  /** Primary variant ID (backwards compat — used for the first variant group) */
  value: string | null | undefined
  /** Primary variant change callback */
  onChange: (variantId: string | null) => void
  /** Additional variant selections keyed by group name (e.g., { size: "uuid" }) */
  variantSelections?: Record<string, string | null>
  /** Callback for additional variant group changes */
  onSelectionsChange?: (selections: Record<string, string | null>) => void
  /** If provided, only render dropdowns for these groups */
  categoryVariantGroups?: string[]
  className?: string
}

export default function VariantSelect({
  priceListId, value, onChange,
  variantSelections, onSelectionsChange,
  categoryVariantGroups, className,
}: VariantSelectProps) {
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

  // If categoryVariantGroups specified, only show those groups (in order)
  const groupsToShow = categoryVariantGroups
    ? categoryVariantGroups.filter(g => groups[g])
    : Object.keys(groups)

  if (groupsToShow.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {groupsToShow.map((group, idx) => {
        const groupVariants = groups[group] || []
        if (groupVariants.length === 0) return null

        // First group uses primary value/onChange for backwards compatibility
        const isFirst = idx === 0
        const selectedValue = isFirst
          ? (value || '')
          : (variantSelections?.[group] || '')

        const handleChange = (variantId: string | null) => {
          if (isFirst) {
            onChange(variantId)
          } else if (onSelectionsChange) {
            onSelectionsChange({
              ...(variantSelections || {}),
              [group]: variantId,
            })
          }
        }

        return (
          <div key={group} className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 capitalize">{group}:</label>
            <select
              value={selectedValue}
              onChange={e => handleChange(e.target.value || null)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">Select {group}...</option>
              {groupVariants.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
