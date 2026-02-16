'use client'

import { useEffect, useState, useRef } from 'react'

interface CatalogItem {
  id: string
  item_code: string
  description: string
  unit: string
  unit_price: number
  is_taxable: boolean
  category: { id: string; name: string } | null
}

interface Props {
  trade: string
  section: 'materials' | 'labor'
  onSelect: (item: { price_list_id: string; description: string; unit: string; unit_price: number; is_taxable: boolean }) => void
  onCustom: () => void
  onClose: () => void
}

export default function CatalogPicker({ trade, section, onSelect, onCustom, onClose }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/price-list?trade=${trade}&section=${section}`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [trade, section])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const filtered = search
    ? items.filter(i =>
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.item_code.toLowerCase().includes(search.toLowerCase())
      )
    : items

  // Group by category
  const grouped = new Map<string, CatalogItem[]>()
  for (const item of filtered) {
    const key = item.category?.name || 'Uncategorized'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  return (
    <div ref={ref} className="absolute z-50 mt-1 w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search catalog..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
          autoFocus
        />
      </div>

      {/* Items list */}
      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-4 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 text-center">
            {search ? 'No matching items' : 'No catalog items for this trade yet'}
          </p>
        ) : (
          Array.from(grouped.entries()).map(([categoryName, categoryItems]) => (
            <div key={categoryName}>
              <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                {categoryName}
              </div>
              {categoryItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect({
                      price_list_id: item.id,
                      description: item.description,
                      unit: item.unit,
                      unit_price: item.unit_price,
                      is_taxable: item.is_taxable,
                    })
                    onClose()
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary/5 flex items-center justify-between group transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 group-hover:text-primary">{item.description}</div>
                    <div className="text-xs text-gray-400 font-mono">{item.item_code} · {item.unit}</div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 ml-4 shrink-0">
                    ${item.unit_price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Custom item option */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={() => { onCustom(); onClose() }}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          + Add custom item (not from catalog)
        </button>
      </div>
    </div>
  )
}
