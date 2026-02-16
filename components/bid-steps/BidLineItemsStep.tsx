'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBidForm, calculateLineItemTotals, type BidLineItem } from '@/components/BidFormProvider'
import CatalogPicker from '@/components/bid-steps/CatalogPicker'

const UNITS = ['EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR']

export default function BidLineItemsStep() {
  const { bid, lineItems, updateLineItem, addLineItem, removeLineItem, calculateTotals } = useBidForm()
  const [activeSection, setActiveSection] = useState<'materials' | 'labor'>('materials')
  const [showCatalog, setShowCatalog] = useState(false)

  // Recalculate totals when line items change
  useEffect(() => {
    calculateTotals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItems.length])

  const sectionItems = lineItems
    .map((item, index) => ({ ...item, _index: index }))
    .filter(item => item.section === activeSection)

  const materialsCount = lineItems.filter(li => li.section === 'materials').length
  const laborCount = lineItems.filter(li => li.section === 'labor').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Line Items</h2>
        <p className="text-sm text-gray-500">
          Add and edit bid line items. Quantities from Hover are marked with a blue indicator.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('materials')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'materials'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Materials ({materialsCount})
        </button>
        <button
          onClick={() => setActiveSection('labor')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'labor'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Labor ({laborCount})
        </button>
      </div>

      {/* Line items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-2 font-medium text-gray-500 w-8">#</th>
              <th className="pb-2 font-medium text-gray-500">Description</th>
              <th className="pb-2 font-medium text-gray-500 w-20 text-right">Qty</th>
              <th className="pb-2 font-medium text-gray-500 w-16">Unit</th>
              <th className="pb-2 font-medium text-gray-500 w-24 text-right">Unit $</th>
              <th className="pb-2 font-medium text-gray-500 w-16 text-right">M%</th>
              <th className="pb-2 font-medium text-gray-500 w-24 text-right">Total P</th>
              <th className="pb-2 font-medium text-gray-500 w-24 text-right">Total M</th>
              <th className="pb-2 font-medium text-gray-500 w-24 text-right">P+M</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sectionItems.map((item, sectionIdx) => (
              <tr key={item._index} className="group">
                <td className="py-2 text-gray-400">{sectionIdx + 1}</td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    {item.qty_source === 'hover' && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="From Hover" />
                    )}
                    <input
                      value={item.description}
                      onChange={e => updateLineItem(item._index, { description: e.target.value })}
                      className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-primary rounded text-sm"
                      placeholder="Item description"
                    />
                  </div>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.qty}
                    onChange={e => updateLineItem(item._index, { qty: parseFloat(e.target.value) || 0, qty_source: 'manual' })}
                    className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-primary rounded text-sm text-right"
                  />
                </td>
                <td className="py-2">
                  <select
                    value={item.unit}
                    onChange={e => updateLineItem(item._index, { unit: e.target.value })}
                    className="px-1 py-1 border border-transparent hover:border-gray-300 focus:border-primary rounded text-sm"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateLineItem(item._index, { unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-primary rounded text-sm text-right"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    step="0.5"
                    value={item.margin_pct}
                    onChange={e => updateLineItem(item._index, { margin_pct: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-primary rounded text-sm text-right"
                  />
                </td>
                <td className="py-2 text-right font-medium">${item.total_price.toFixed(2)}</td>
                <td className="py-2 text-right text-gray-500">${item.total_margin.toFixed(2)}</td>
                <td className="py-2 text-right font-semibold">${item.line_total.toFixed(2)}</td>
                <td className="py-2">
                  <button
                    onClick={() => removeLineItem(item._index)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    title="Remove"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sectionItems.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">
          No {activeSection} items yet. Add items below.
        </p>
      )}

      {/* Add item button + catalog picker */}
      <div className="relative">
        <button
          onClick={() => setShowCatalog(true)}
          className="text-sm text-primary font-medium hover:text-primary-dark"
        >
          + Add {activeSection === 'materials' ? 'Material' : 'Labor'} Item
        </button>

        {showCatalog && (
          <CatalogPicker
            trade={bid.trade}
            section={activeSection}
            onSelect={(item) => {
              addLineItem(activeSection, {
                price_list_id: item.price_list_id,
                description: item.description,
                unit: item.unit,
                unit_price: item.unit_price,
                is_taxable: item.is_taxable,
              })
            }}
            onCustom={() => addLineItem(activeSection)}
            onClose={() => setShowCatalog(false)}
          />
        )}
      </div>

      {/* Section subtotals */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Materials Subtotal (P+M):</span>
          <span className="font-medium">
            ${lineItems.filter(li => li.section === 'materials').reduce((sum, li) => sum + li.line_total, 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Labor Subtotal (P+M):</span>
          <span className="font-medium">
            ${lineItems.filter(li => li.section === 'labor').reduce((sum, li) => sum + li.line_total, 0).toFixed(2)}
          </span>
        </div>
        {bid.tax_rate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax ({bid.tax_rate}%):</span>
            <span className="font-medium">${bid.tax_total.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
          <span>Grand Total:</span>
          <span>${bid.grand_total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Total Margin:</span>
          <span>${bid.margin_total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
