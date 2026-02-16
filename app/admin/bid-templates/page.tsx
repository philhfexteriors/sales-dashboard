'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface TemplateItem {
  id: string
  section: string
  description: string
  unit: string
  default_qty_formula: string | null
  default_qty: number | null
  is_required: boolean
  sort_order: number
  price_list: {
    id: string
    item_code: string
    description: string
    unit: string
    unit_price: number
  } | null
}

interface Template {
  id: string
  trade: string
  name: string
  description: string | null
  active: boolean
  bid_template_items: TemplateItem[]
}

interface PriceListItem {
  id: string
  item_code: string
  description: string
  unit: string
  unit_price: number
  section: string
}

const TRADES = [
  { key: 'roof', label: 'Roofing' },
  { key: 'siding', label: 'Siding' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'fascia_soffit', label: 'Fascia & Soffit' },
]

const UNITS = ['EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR']

export default function BidTemplatesAdmin() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTrade, setActiveTrade] = useState('roof')
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDesc, setNewTemplateDesc] = useState('')

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
          items: [],
        }),
      })
      if (res.ok) {
        toast.success('Template created')
        setShowCreateForm(false)
        setNewTemplateName('')
        setNewTemplateDesc('')
        fetchTemplates()
      } else {
        toast.error('Failed to create template')
      }
    } catch {
      toast.error('Failed to create template')
    }
  }

  const addItemToTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    const newItem = {
      section: 'materials',
      description: 'New Item',
      unit: 'EA',
      default_qty_formula: null,
      default_qty: 1,
      is_required: true,
      price_list_id: null,
      sort_order: template.bid_template_items.length,
      notes: null,
    }

    const items = [
      ...template.bid_template_items.map(item => ({
        section: item.section,
        description: item.description,
        unit: item.unit,
        default_qty_formula: item.default_qty_formula,
        default_qty: item.default_qty,
        is_required: item.is_required,
        price_list_id: item.price_list?.id || null,
        sort_order: item.sort_order,
        notes: null,
      })),
      newItem,
    ]

    try {
      const res = await fetch(`/api/bid-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (res.ok) {
        toast.success('Item added')
        fetchTemplates()
      }
    } catch {
      toast.error('Failed to add item')
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
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bid Templates</h1>
              <p className="text-sm text-gray-500 mt-1">Standard line items per trade</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Standard Siding Bid"
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
                <div
                  key={template.id}
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${!template.active ? 'opacity-60' : ''}`}
                >
                  {/* Template header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{expandedTemplate === template.id ? '▼' : '▶'}</span>
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-xs text-gray-500">
                          {template.bid_template_items.length} items
                          {template.description && ` · ${template.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => addItemToTemplate(template.id)}
                        className="text-xs text-primary font-medium px-2 py-1"
                      >
                        + Add Item
                      </button>
                      <button
                        onClick={() => toggleTemplateActive(template)}
                        className={`text-xs font-medium px-2 py-1 ${template.active ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {template.active ? 'Deactivate' : 'Restore'}
                      </button>
                    </div>
                  </div>

                  {/* Template items */}
                  {expandedTemplate === template.id && (
                    <div className="border-t border-gray-200">
                      {template.bid_template_items.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          No items yet. Click &ldquo;+ Add Item&rdquo; to start building this template.
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left">
                              <th className="px-4 py-2 font-medium text-gray-500">Section</th>
                              <th className="px-4 py-2 font-medium text-gray-500">Description</th>
                              <th className="px-4 py-2 font-medium text-gray-500">Unit</th>
                              <th className="px-4 py-2 font-medium text-gray-500">Qty Formula</th>
                              <th className="px-4 py-2 font-medium text-gray-500">Default Qty</th>
                              <th className="px-4 py-2 font-medium text-gray-500">Price List</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {template.bid_template_items
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                      item.section === 'materials'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {item.section}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-gray-900">{item.description}</td>
                                  <td className="px-4 py-2 text-gray-600">{item.unit}</td>
                                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                                    {item.default_qty_formula || '—'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-600">
                                    {item.default_qty ?? '—'}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-gray-500">
                                    {item.price_list
                                      ? `${item.price_list.item_code} ($${item.price_list.unit_price}/${item.price_list.unit})`
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  )
}
