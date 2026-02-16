'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { MEASUREMENT_VARIABLES } from '@/lib/services/formulaEvaluator'

// ---------- Types ----------

interface TemplateItem {
  id: string
  section: string
  description: string
  unit: string
  default_qty_formula: string | null
  default_qty: number | null
  is_required: boolean
  sort_order: number
  measurement_key: string | null
  depends_on_item_id: string | null
  price_list: {
    id: string
    description: string
    unit: string
    unit_price: number
    is_taxable: boolean
  } | null
}

interface Template {
  id: string
  trade: string
  name: string
  description: string | null
  active: boolean
  waste_pct: number
  bid_template_items: TemplateItem[]
}

interface PriceListItem {
  id: string
  description: string
  unit: string
  unit_price: number
  section: string
  brand: string | null
  is_taxable: boolean
}

// ---------- Constants ----------

const TRADES = [
  { key: 'roof', label: 'Roofing' },
  { key: 'siding', label: 'Siding' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'fascia_soffit', label: 'Fascia & Soffit' },
]

const UNITS = ['EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR']

// ---------- Main Component ----------

export default function BidTemplatesAdmin() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTrade, setActiveTrade] = useState('roof')
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDesc, setNewTemplateDesc] = useState('')
  const [newTemplateWaste, setNewTemplateWaste] = useState(10)
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const [templatesRes, pricesRes] = await Promise.all([
        fetch(`/api/bid-templates?trade=${activeTrade}&active=false`),
        fetch(`/api/price-list?trade=${activeTrade}`),
      ])
      if (templatesRes.ok) setTemplates(await templatesRes.json())
      if (pricesRes.ok) setPriceListItems(await pricesRes.json())
    } catch {
      toast.error('Failed to load templates')
    }
    setLoading(false)
  }, [activeTrade])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Template name required')
      return
    }
    try {
      const res = await fetch('/api/bid-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade: activeTrade,
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim() || null,
          waste_pct: newTemplateWaste,
          items: [],
        }),
      })
      if (res.ok) {
        toast.success('Template created')
        setShowCreateForm(false)
        setNewTemplateName('')
        setNewTemplateDesc('')
        setNewTemplateWaste(10)
        fetchTemplates()
      } else {
        toast.error('Failed to create template')
      }
    } catch {
      toast.error('Failed to create template')
    }
  }

  const toggleTemplateActive = async (template: Template) => {
    try {
      const res = await fetch(`/api/bid-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !template.active }),
      })
      if (res.ok) {
        toast.success(template.active ? 'Template deactivated' : 'Template restored')
        fetchTemplates()
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'sales_manager']}>
      <AppShell>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bid Templates</h1>
              <p className="text-sm text-gray-500 mt-1">Configure standard line items with formula-based quantities</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              + New Template
            </button>
          </div>

          {/* Trade tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
            {TRADES.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTrade(t.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTrade === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Create New Template</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Standard Roofing Bid"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input
                    value={newTemplateDesc}
                    onChange={e => setNewTemplateDesc(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Default Waste %</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={newTemplateWaste}
                    onChange={e => setNewTemplateWaste(parseFloat(e.target.value) || 10)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={createTemplate} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                    Create
                  </button>
                  <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <Loading message="Loading templates..." />
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No templates for {TRADES.find(t => t.key === activeTrade)?.label}</p>
              <p className="text-sm">Create a template to define standard line items for bids.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  expanded={expandedTemplate === template.id}
                  onToggle={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                  onToggleActive={() => toggleTemplateActive(template)}
                  onRefresh={fetchTemplates}
                  priceListItems={priceListItems}
                  trade={activeTrade}
                  saving={savingTemplate === template.id}
                  setSaving={(v) => setSavingTemplate(v ? template.id : null)}
                />
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  )
}

// ---------- Template Card ----------

function TemplateCard({
  template,
  expanded,
  onToggle,
  onToggleActive,
  onRefresh,
  priceListItems,
  trade,
  saving,
  setSaving,
}: {
  template: Template
  expanded: boolean
  onToggle: () => void
  onToggleActive: () => void
  onRefresh: () => void
  priceListItems: PriceListItem[]
  trade: string
  saving: boolean
  setSaving: (v: boolean) => void
}) {
  const [items, setItems] = useState<TemplateItem[]>(template.bid_template_items)
  const [wastePct, setWastePct] = useState(template.waste_pct)
  const [dirty, setDirty] = useState(false)

  // Sync items when template changes from server
  useEffect(() => {
    setItems(template.bid_template_items)
    setWastePct(template.waste_pct)
    setDirty(false)
  }, [template])

  const saveTemplate = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/bid-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waste_pct: wastePct,
          items: items.map((item, index) => ({
            id: item.id.startsWith('new-') ? undefined : item.id,
            section: item.section,
            description: item.description,
            unit: item.unit,
            default_qty_formula: item.default_qty_formula || null,
            default_qty: item.default_qty,
            is_required: item.is_required,
            price_list_id: item.price_list?.id || null,
            sort_order: index,
            measurement_key: item.measurement_key || null,
            depends_on_item_id: item.depends_on_item_id?.startsWith('new-') ? null : (item.depends_on_item_id || null),
            notes: null,
          })),
        }),
      })
      if (res.ok) {
        toast.success('Template saved')
        setDirty(false)
        onRefresh()
      } else {
        toast.error('Failed to save template')
      }
    } catch {
      toast.error('Failed to save template')
    }
    setSaving(false)
  }

  const addItem = (fromCatalog?: PriceListItem) => {
    setItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      section: fromCatalog?.section as 'materials' | 'labor' || 'materials',
      description: fromCatalog?.description || '',
      unit: fromCatalog?.unit || 'EA',
      default_qty_formula: null,
      default_qty: null,
      is_required: true,
      sort_order: prev.length,
      measurement_key: null,
      depends_on_item_id: null,
      price_list: fromCatalog ? {
        id: fromCatalog.id,
        description: fromCatalog.description,
        unit: fromCatalog.unit,
        unit_price: fromCatalog.unit_price,
        is_taxable: fromCatalog.is_taxable,
      } : null,
    }])
    setDirty(true)
  }

  const removeItem = (index: number) => {
    const removedId = items[index].id
    setItems(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Clear depends_on references to removed item
      return updated.map(item =>
        item.depends_on_item_id === removedId
          ? { ...item, depends_on_item_id: null }
          : item
      )
    })
    setDirty(true)
  }

  const updateItem = (index: number, updates: Partial<TemplateItem>) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
    setDirty(true)
  }

  const linkPriceList = (index: number, plItem: PriceListItem) => {
    updateItem(index, {
      price_list: {
        id: plItem.id,
        description: plItem.description,
        unit: plItem.unit,
        unit_price: plItem.unit_price,
        is_taxable: plItem.is_taxable,
      },
      description: plItem.description,
      unit: plItem.unit,
    })
  }

  const formulaItemCount = items.filter(i => i.default_qty_formula).length

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${!template.active ? 'opacity-60' : ''}`}>
      {/* Template header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400">{expanded ? '\u25BC' : '\u25B6'}</span>
          <div>
            <h3 className="font-medium text-gray-900">{template.name}</h3>
            <p className="text-xs text-gray-500">
              {items.length} items
              {formulaItemCount > 0 && ` \u00B7 ${formulaItemCount} with formulas`}
              {` \u00B7 ${wastePct}% waste`}
              {template.description && ` \u00B7 ${template.description}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {dirty && (
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={onToggleActive}
            className={`text-xs font-medium px-2 py-1 ${template.active ? 'text-red-500' : 'text-green-600'}`}
          >
            {template.active ? 'Deactivate' : 'Restore'}
          </button>
        </div>
      </div>

      {/* Template items */}
      {expanded && (
        <div className="border-t border-gray-200">
          {/* Waste % setting */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Default Waste %:</label>
            <input
              type="number"
              step="1"
              min="0"
              max="50"
              value={wastePct}
              onChange={e => { setWastePct(parseFloat(e.target.value) || 10); setDirty(true) }}
              className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right"
            />
            <span className="text-xs text-gray-400">
              Available in formulas as {'{waste}'} = {((wastePct + 100) / 100).toFixed(2)} factor
            </span>
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No items yet. Click &ldquo;+ Add Item&rdquo; to start building this template.
            </div>
          ) : (
            <div>
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-3 py-2 font-medium text-gray-500" style={{ width: 110 }}>Section</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Description</th>
                    <th className="px-3 py-2 font-medium text-gray-500" style={{ width: 70 }}>Unit</th>
                    <th className="px-3 py-2 font-medium text-gray-500" style={{ width: 260 }}>Formula</th>
                    <th className="px-3 py-2 font-medium text-gray-500" style={{ width: 90 }}>Fallback Qty</th>
                    <th className="px-3 py-2 font-medium text-gray-500" style={{ width: 150 }}>Depends On</th>
                    <th className="px-3 py-2 font-medium text-gray-500" style={{ width: 120 }}>Price List</th>
                    <th className="px-3 py-2" style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <TemplateItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      items={items}
                      trade={trade}
                      priceListItems={priceListItems}
                      onUpdate={(updates) => updateItem(index, updates)}
                      onLinkPriceList={(pl) => linkPriceList(index, pl)}
                      onRemove={() => removeItem(index)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add item from catalog */}
          <AddTemplateItemPicker
            priceListItems={priceListItems}
            onSelectCatalog={(pl) => addItem(pl)}
            onCustom={() => addItem()}
          />

          {/* Save button at bottom */}
          {dirty && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
              <span className="text-sm text-amber-700">You have unsaved changes</span>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Template Item Row ----------

function TemplateItemRow({
  item,
  items,
  trade,
  priceListItems,
  onUpdate,
  onLinkPriceList,
  onRemove,
}: {
  item: TemplateItem
  index: number
  items: TemplateItem[]
  trade: string
  priceListItems: PriceListItem[]
  onUpdate: (updates: Partial<TemplateItem>) => void
  onLinkPriceList: (pl: PriceListItem) => void
  onRemove: () => void
}) {
  const [showVarPicker, setShowVarPicker] = useState(false)
  const [showPriceSearch, setShowPriceSearch] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const varButtonRef = useRef<HTMLButtonElement>(null)
  const priceSearchRef = useRef<HTMLDivElement>(null)
  const formulaInputRef = useRef<HTMLInputElement>(null)

  // Calculate position when opening the var picker
  const toggleVarPicker = () => {
    if (!showVarPicker && varButtonRef.current) {
      const rect = varButtonRef.current.getBoundingClientRect()
      setPickerPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 330) })
    }
    setShowVarPicker(!showVarPicker)
  }

  // Close popovers on outside click or scroll
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showVarPicker && varButtonRef.current && !varButtonRef.current.contains(e.target as Node)) {
        // Check if click is inside the portal dropdown
        const portal = document.getElementById('formula-var-picker')
        if (portal && portal.contains(e.target as Node)) return
        setShowVarPicker(false)
      }
      if (priceSearchRef.current && !priceSearchRef.current.contains(e.target as Node)) {
        setShowPriceSearch(false)
      }
    }
    function handleScroll() {
      if (showVarPicker) setShowVarPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [showVarPicker])

  // Insert a token into the formula at cursor position
  const insertToken = (token: string) => {
    const input = formulaInputRef.current
    const current = item.default_qty_formula || ''
    if (input) {
      const start = input.selectionStart ?? current.length
      const end = input.selectionEnd ?? current.length
      // Add spaces around token if needed
      const before = current.slice(0, start)
      const after = current.slice(end)
      const needSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('(')
      const needSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith(')')
      const newFormula = before + (needSpaceBefore ? ' ' : '') + token + (needSpaceAfter ? ' ' : '') + after
      onUpdate({ default_qty_formula: newFormula || null })
      // Restore focus and cursor position after React re-render
      setTimeout(() => {
        if (input) {
          input.focus()
          const newPos = before.length + (needSpaceBefore ? 1 : 0) + token.length + (needSpaceAfter ? 1 : 0)
          input.setSelectionRange(newPos, newPos)
        }
      }, 0)
    } else {
      // No input ref, just append
      const newFormula = current ? `${current} ${token}` : token
      onUpdate({ default_qty_formula: newFormula || null })
    }
    setShowVarPicker(false)
  }

  // Other items for "depends on" dropdown (exclude self)
  const otherItems = items.filter(i => i.id !== item.id)

  return (
    <tr className="hover:bg-gray-50 group align-top">
      {/* Section */}
      <td className="px-3 py-2">
        <select
          value={item.section}
          onChange={e => onUpdate({ section: e.target.value })}
          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
        >
          <option value="materials">Materials</option>
          <option value="labor">Labor</option>
        </select>
      </td>

      {/* Description */}
      <td className="px-3 py-2">
        <input
          value={item.description}
          onChange={e => onUpdate({ description: e.target.value })}
          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
          placeholder="Item description"
        />
      </td>

      {/* Unit */}
      <td className="px-3 py-2">
        <select
          value={item.unit}
          onChange={e => onUpdate({ unit: e.target.value })}
          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
        >
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>

      {/* Formula */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            ref={formulaInputRef}
            value={item.default_qty_formula || ''}
            onChange={e => onUpdate({ default_qty_formula: e.target.value || null })}
            className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-mono"
            placeholder="Click {x} to build"
          />
          <button
            ref={varButtonRef}
            onClick={toggleVarPicker}
            className={`shrink-0 px-1.5 py-0.5 flex items-center justify-center rounded text-xs font-bold border font-mono transition-colors ${
              showVarPicker
                ? 'text-primary border-primary bg-primary/5'
                : 'text-gray-500 border-gray-300 hover:text-primary hover:border-primary'
            }`}
            title="Insert variable"
          >
            {'{x}'}
          </button>
        </div>
        {showVarPicker && pickerPos && ReactDOM.createPortal(
          <FormulaVariablePicker
            trade={trade}
            otherItems={otherItems}
            onInsert={insertToken}
            onClose={() => setShowVarPicker(false)}
            style={{ position: 'fixed', top: pickerPos.top, left: pickerPos.left }}
          />,
          document.body
        )}
      </td>

      {/* Fallback Qty (used when no formula) */}
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={item.default_qty ?? ''}
          onChange={e => onUpdate({ default_qty: e.target.value ? parseFloat(e.target.value) : null })}
          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right"
          placeholder="—"
        />
      </td>

      {/* Depends On */}
      <td className="px-3 py-2">
        <select
          value={item.depends_on_item_id || ''}
          onChange={e => onUpdate({ depends_on_item_id: e.target.value || null })}
          className="w-full px-1 py-1 border border-gray-200 rounded text-xs truncate"
        >
          <option value="">None</option>
          {otherItems.map(other => (
            <option key={other.id} value={other.id}>
              {other.description || `Item ${items.indexOf(other) + 1}`}
            </option>
          ))}
        </select>
      </td>

      {/* Price List */}
      <td className="px-3 py-2">
        <div className="relative" ref={priceSearchRef}>
          {item.price_list ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-700 truncate" title={`${item.price_list.description} - $${item.price_list.unit_price}/${item.price_list.unit}`}>
                ${item.price_list.unit_price}/{item.price_list.unit}
              </span>
              <button
                onClick={() => onUpdate({ price_list: null })}
                className="text-gray-400 hover:text-red-500 shrink-0 text-xs"
                title="Unlink"
              >
                x
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPriceSearch(!showPriceSearch)}
              className="text-xs text-primary font-medium"
            >
              Link
            </button>
          )}
          {showPriceSearch && (
            <PriceListSearchPopover
              items={priceListItems}
              section={item.section}
              onSelect={(pl) => { onLinkPriceList(pl); setShowPriceSearch(false) }}
              onClose={() => setShowPriceSearch(false)}
            />
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
          title="Remove item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  )
}

// ---------- Formula Variable Picker ----------

function FormulaVariablePicker({
  trade,
  otherItems,
  onInsert,
  onClose,
  style,
}: {
  trade: string
  otherItems: TemplateItem[]
  onInsert: (token: string) => void
  onClose: () => void
  style?: React.CSSProperties
}) {
  const vars = MEASUREMENT_VARIABLES[trade] || []

  return (
    <div
      id="formula-var-picker"
      className="z-[9999] w-80 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden text-xs"
      style={style}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <h4 className="font-semibold text-gray-700">Insert Variable</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">&times;</button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {/* Hover Measurements */}
        {vars.length > 0 && (
          <div>
            <div className="px-3 py-1.5 bg-blue-50 text-xs font-semibold text-blue-700 uppercase tracking-wider sticky top-0">
              {TRADES.find(t => t.key === trade)?.label} Measurements
            </div>
            {vars.map(v => (
              <button
                key={v.key}
                onClick={() => onInsert(`{${v.key}}`)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between group transition-colors"
              >
                <div>
                  <code className="text-blue-700 font-mono font-medium">{`{${v.key}}`}</code>
                  <span className="text-gray-400 ml-2">{v.label}</span>
                </div>
                <span className="text-gray-400 text-xs">{v.unit}</span>
              </button>
            ))}
          </div>
        )}

        {/* Waste variables */}
        <div>
          <div className="px-3 py-1.5 bg-purple-50 text-xs font-semibold text-purple-700 uppercase tracking-wider sticky top-0">
            Waste &amp; Special
          </div>
          <button
            onClick={() => onInsert('{waste}')}
            className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between transition-colors"
          >
            <div>
              <code className="text-purple-700 font-mono font-medium">{'{waste}'}</code>
              <span className="text-gray-400 ml-2">Waste factor (e.g. 1.15)</span>
            </div>
          </button>
          <button
            onClick={() => onInsert('{waste_pct}')}
            className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between transition-colors"
          >
            <div>
              <code className="text-purple-700 font-mono font-medium">{'{waste_pct}'}</code>
              <span className="text-gray-400 ml-2">Raw waste % (e.g. 15)</span>
            </div>
          </button>
        </div>

        {/* Other template items (for dependency references) */}
        {otherItems.filter(i => i.description).length > 0 && (
          <div>
            <div className="px-3 py-1.5 bg-amber-50 text-xs font-semibold text-amber-700 uppercase tracking-wider sticky top-0">
              Other Items (qty reference)
            </div>
            {otherItems.filter(i => i.description).map(other => (
              <button
                key={other.id}
                onClick={() => onInsert(`{item:${other.description}}`)}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center justify-between transition-colors"
              >
                <div>
                  <code className="text-amber-700 font-mono font-medium">{`{item:${other.description}}`}</code>
                </div>
                <span className="text-gray-400 text-xs">{other.unit}</span>
              </button>
            ))}
          </div>
        )}

        {/* Operators */}
        <div>
          <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
            Operators
          </div>
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {['+', '-', '*', '/', '(', ')', '100', '15', '30'].map(op => (
              <button
                key={op}
                onClick={() => onInsert(op)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-mono font-medium text-gray-700 transition-colors"
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Add Template Item Picker ----------

function AddTemplateItemPicker({
  priceListItems,
  onSelectCatalog,
  onCustom,
}: {
  priceListItems: PriceListItem[]
  onSelectCatalog: (item: PriceListItem) => void
  onCustom: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  const filtered = search
    ? priceListItems.filter(i =>
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.brand?.toLowerCase().includes(search.toLowerCase())
      )
    : priceListItems

  // Group by section
  const materials = filtered.filter(i => i.section === 'materials')
  const labor = filtered.filter(i => i.section === 'labor')

  return (
    <div className="px-4 py-3 border-t border-gray-100 relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-primary font-medium hover:text-primary-dark"
      >
        + Add Item from Catalog
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 left-4 w-96 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
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

          {/* Items grouped by section */}
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">
                {search ? 'No matching items' : 'No catalog items for this trade'}
              </p>
            ) : (
              <>
                {materials.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                      Materials
                    </div>
                    {materials.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectCatalog(item)
                          setOpen(false)
                          setSearch('')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary/5 flex items-center justify-between group transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 group-hover:text-primary">{item.description}</div>
                          <div className="text-xs text-gray-400">{item.brand && `${item.brand} · `}{item.unit}</div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 ml-4 shrink-0">
                          ${item.unit_price.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {labor.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                      Labor
                    </div>
                    {labor.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectCatalog(item)
                          setOpen(false)
                          setSearch('')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary/5 flex items-center justify-between group transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 group-hover:text-primary">{item.description}</div>
                          <div className="text-xs text-gray-400">{item.brand && `${item.brand} · `}{item.unit}</div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 ml-4 shrink-0">
                          ${item.unit_price.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Custom item option */}
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={() => { onCustom(); setOpen(false); setSearch('') }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              + Add custom item (not in catalog)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Price List Search Popover ----------

function PriceListSearchPopover({
  items,
  section,
  onSelect,
  onClose,
}: {
  items: PriceListItem[]
  section: string
  onSelect: (item: PriceListItem) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = items
    .filter(i => i.section === section)
    .filter(i => {
      if (!search) return true
      const q = search.toLowerCase()
      return i.description.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)
    })

  return (
    <div className="absolute z-50 top-full mt-1 right-0 w-72 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
      <div className="p-2 border-b border-gray-100">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search catalog..."
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-3 text-center">No items found</p>
        ) : filtered.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm flex justify-between"
          >
            <div className="truncate">
              <span className="text-gray-900">{item.description}</span>
              {item.brand && <span className="text-gray-400 ml-1 text-xs">{item.brand}</span>}
            </div>
            <span className="text-gray-600 shrink-0 ml-2">
              ${item.unit_price}/{item.unit}
            </span>
          </button>
        ))}
      </div>
      <div className="p-2 border-t border-gray-100">
        <button onClick={onClose} className="text-xs text-gray-400">Cancel</button>
      </div>
    </div>
  )
}
