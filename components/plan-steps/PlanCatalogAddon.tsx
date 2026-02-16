'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlanForm } from '@/components/PlanFormProvider'
import CurrencyInput from '@/components/fields/CurrencyInput'
import VariantSelect from '@/components/fields/VariantSelect'

interface CatalogItem {
  id: string
  item_code: string
  brand: string | null
  description: string
  unit: string
  unit_price: number
  section: string
  is_taxable: boolean
  category?: { id: string; name: string; variant_groups?: string[] | null } | null
}

// Map plan sections to catalog trades
const sectionToTrade: Record<string, string> = {
  roof: 'roof',
  siding: 'siding',
  guttering: 'gutters',
  windows: 'windows',
  small_jobs: 'general',
  misc: 'general',
}

interface PlanCatalogAddonProps {
  section: string
}

export default function PlanCatalogAddon({ section }: PlanCatalogAddonProps) {
  const { lineItems, addCatalogLineItem, updateLineItem, removeLineItem } = usePlanForm()
  const [showPicker, setShowPicker] = useState(false)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Get catalog items that have already been added to this section
  const catalogLineItems = lineItems.filter(
    li => li.section === section && li.field_key.includes('catalog_') && li.price_list_id
  )

  const trade = sectionToTrade[section] || 'general'

  // Build a map of price_list_id to catalog item for category lookup
  const catalogItemMap = catalogItems.reduce<Record<string, CatalogItem>>((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})

  // Fetch catalog items when picker opens (or eagerly for variant group lookup)
  useEffect(() => {
    if (!showPicker && catalogItems.length > 0) return
    if (!showPicker) {
      // Fetch in background for variant group info on already-added items
      if (catalogLineItems.length === 0) return
    }
    setLoading(true)
    fetch(`/api/price-list?trade=${trade}`)
      .then(r => r.json())
      .then(data => {
        setCatalogItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker, trade])

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPicker])

  const handleSelectItem = useCallback((item: CatalogItem) => {
    addCatalogLineItem(section, {
      price_list_id: item.id,
      description: item.description,
      unit_price: item.unit_price,
      unit: item.unit,
    })
    setShowPicker(false)
    setSearch('')
  }, [section, addCatalogLineItem])

  const handleQtyChange = useCallback((fieldKey: string, qty: number, unitPrice: number) => {
    const amount = Math.round(qty * unitPrice * 100) / 100
    updateLineItem(fieldKey, section, { amount, options: { qty, unit_price: unitPrice } as Record<string, unknown> })
  }, [section, updateLineItem])

  const handleAmountOverride = useCallback((fieldKey: string, amount: number) => {
    updateLineItem(fieldKey, section, { amount })
  }, [section, updateLineItem])

  // Filter catalog items
  const filtered = catalogItems.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.description.toLowerCase().includes(q) ||
      item.item_code?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.category?.name?.toLowerCase().includes(q)
    )
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const cat = item.category?.name || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  // Already-added IDs to show a check mark
  const addedIds = new Set(catalogLineItems.map(li => li.price_list_id))

  return (
    <div className="space-y-3">
      {/* Already-added catalog add-ons */}
      {catalogLineItems.map(item => {
        const qty = (item.options as Record<string, number> | null)?.qty || 0
        const unitPrice = (item.options as Record<string, number> | null)?.unit_price || 0
        const variantSelections = (item.options as Record<string, unknown> | null)?.variant_selections as Record<string, string | null> | undefined
        const catItem = item.price_list_id ? catalogItemMap[item.price_list_id] : null
        const categoryVariantGroups = catItem?.category?.variant_groups ?? undefined

        return (
          <div key={item.field_key} className="bg-white rounded-lg border border-primary/20 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    Catalog
                  </span>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => removeLineItem(item.field_key, section)}
                className="text-gray-400 hover:text-red-500 p-1 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Qty</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={qty || ''}
                  onChange={e => handleQtyChange(item.field_key, parseFloat(e.target.value) || 0, unitPrice)}
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Unit $</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice || ''}
                  onChange={e => {
                    const newPrice = parseFloat(e.target.value) || 0
                    handleQtyChange(item.field_key, qty, newPrice)
                  }}
                  className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0.00"
                />
              </div>
              <span className="text-xs text-gray-400">=</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Total</label>
                <CurrencyInput
                  value={item.amount}
                  onChange={val => handleAmountOverride(item.field_key, val)}
                  className="w-32 shrink-0"
                />
              </div>
            </div>

            {qty > 0 && unitPrice > 0 && item.amount !== Math.round(qty * unitPrice * 100) / 100 && (
              <p className="text-xs text-amber-600 mt-1.5">
                Price manually adjusted (calculated: ${(qty * unitPrice).toFixed(2)})
              </p>
            )}

            {/* Variant selector (e.g. color, size) */}
            {item.price_list_id && (
              <div className="mt-2">
                <VariantSelect
                  priceListId={item.price_list_id}
                  value={item.variant_id || null}
                  onChange={variantId => updateLineItem(item.field_key, section, { variant_id: variantId })}
                  categoryVariantGroups={categoryVariantGroups || undefined}
                  variantSelections={variantSelections || {}}
                  onSelectionsChange={selections => updateLineItem(item.field_key, section, {
                    options: { ...(item.options as Record<string, unknown> || {}), variant_selections: selections }
                  })}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Add from catalog button + picker */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-full py-3 border-2 border-dashed border-primary/30 rounded-lg text-sm font-medium text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add from Product Catalog
        </button>

        {showPicker && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-80 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search catalog items..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>

            {/* Items */}
            <div className="overflow-y-auto max-h-60">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                  <p className="text-xs text-gray-400 mt-2">Loading catalog...</p>
                </div>
              ) : Object.keys(grouped).length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  {search ? 'No items match your search' : 'No catalog items for this trade'}
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                      {category}
                    </div>
                    {items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className="w-full text-left px-3 py-2.5 hover:bg-primary/5 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                          <p className="text-xs text-gray-400">
                            {item.brand && `${item.brand} · `}{item.item_code} · {item.unit} · {item.section}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium text-gray-700">
                            ${item.unit_price.toFixed(2)}
                          </span>
                          {addedIds.has(item.id) && (
                            <span className="text-primary">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
