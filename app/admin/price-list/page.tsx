'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface PriceListItem {
  id: string
  trade: string
  section: string
  item_code: string
  description: string
  unit: string
  unit_price: number
  is_taxable: boolean
  active: boolean
  sort_order: number
  notes: string | null
}

interface PriceHistory {
  id: string
  old_unit_price: number
  new_unit_price: number
  changed_at: string
  reason: string | null
}

const TRADES = [
  { key: 'roof', label: 'Roofing' },
  { key: 'siding', label: 'Siding' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'fascia_soffit', label: 'Fascia & Soffit' },
  { key: 'general', label: 'General' },
]

const UNITS = ['EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR']

export default function PriceListAdmin() {
  const [items, setItems] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTrade, setActiveTrade] = useState('roof')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<PriceListItem>>({})
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({
    item_code: '',
    description: '',
    unit: 'EA',
    unit_price: 0,
    section: 'materials' as 'materials' | 'labor',
    is_taxable: false,
    notes: '',
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/price-list?trade=${activeTrade}&active=false`)
      if (res.ok) setItems(await res.json())
    } catch {
      toast.error('Failed to load price list')
    }
    setLoading(false)
  }, [activeTrade])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const fetchHistory = async (itemId: string) => {
    if (historyFor === itemId) {
      setHistoryFor(null)
      return
    }
    setHistoryFor(itemId)
    try {
      const res = await fetch(`/api/price-list?trade=${activeTrade}`)
      // Price history is fetched directly from Supabase client-side
      // For now, we'll use the API. In production, you'd have a dedicated endpoint.
      setHistory([]) // placeholder
    } catch {
      setHistory([])
    }
  }

  const startEditing = (item: PriceListItem) => {
    setEditingId(item.id)
    setEditData({
      description: item.description,
      unit: item.unit,
      unit_price: item.unit_price,
      is_taxable: item.is_taxable,
      notes: item.notes,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      const res = await fetch(`/api/price-list/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        toast.success('Price updated')
        setEditingId(null)
        fetchItems()
      } else {
        toast.error('Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  const toggleActive = async (item: PriceListItem) => {
    try {
      const res = await fetch(`/api/price-list/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      if (res.ok) {
        toast.success(item.active ? 'Item deactivated' : 'Item restored')
        fetchItems()
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  const addItem = async () => {
    if (!newItem.item_code || !newItem.description) {
      toast.error('Item code and description required')
      return
    }
    try {
      const res = await fetch('/api/price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          trade: activeTrade,
          sort_order: items.length,
        }),
      })
      if (res.ok) {
        toast.success('Item added')
        setShowAddForm(false)
        setNewItem({ item_code: '', description: '', unit: 'EA', unit_price: 0, section: 'materials', is_taxable: false, notes: '' })
        fetchItems()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add')
      }
    } catch {
      toast.error('Failed to add')
    }
  }

  const materialItems = items.filter(i => i.section === 'materials')
  const laborItems = items.filter(i => i.section === 'labor')

  return (
    <RoleGuard allowedRoles={['admin', 'sales_manager']}>
      <AppShell>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Price List</h1>
              <p className="text-sm text-gray-500 mt-1">Manage material and labor pricing</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              + Add Item
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

          {/* Add form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Add New Price Item</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                  <select
                    value={newItem.section}
                    onChange={e => setNewItem({ ...newItem, section: e.target.value as 'materials' | 'labor' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="materials">Materials</option>
                    <option value="labor">Labor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Item Code</label>
                  <input
                    value={newItem.item_code}
                    onChange={e => setNewItem({ ...newItem, item_code: e.target.value })}
                    placeholder="e.g., ROOF-SHINGLES"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input
                    value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="e.g., Landmark Pro Shingles"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={e => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newItem.is_taxable}
                      onChange={e => setNewItem({ ...newItem, is_taxable: e.target.checked })}
                      className="rounded"
                    />
                    Taxable
                  </label>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={addItem} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                    Add
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <Loading message="Loading price list..." />
          ) : (
            <div className="space-y-8">
              {/* Materials */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Materials</h2>
                {materialItems.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No material items for this trade yet.</p>
                ) : (
                  <ItemTable
                    items={materialItems}
                    editingId={editingId}
                    editData={editData}
                    onStartEdit={startEditing}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onEditChange={setEditData}
                    onToggleActive={toggleActive}
                    onToggleHistory={fetchHistory}
                    historyFor={historyFor}
                    history={history}
                  />
                )}
              </div>

              {/* Labor */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Labor</h2>
                {laborItems.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No labor items for this trade yet.</p>
                ) : (
                  <ItemTable
                    items={laborItems}
                    editingId={editingId}
                    editData={editData}
                    onStartEdit={startEditing}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onEditChange={setEditData}
                    onToggleActive={toggleActive}
                    onToggleHistory={fetchHistory}
                    historyFor={historyFor}
                    history={history}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  )
}

function ItemTable({
  items,
  editingId,
  editData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onToggleActive,
  onToggleHistory,
  historyFor,
  history,
}: {
  items: PriceListItem[]
  editingId: string | null
  editData: Partial<PriceListItem>
  onStartEdit: (item: PriceListItem) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditChange: (data: Partial<PriceListItem>) => void
  onToggleActive: (item: PriceListItem) => void
  onToggleHistory: (id: string) => void
  historyFor: string | null
  history: PriceHistory[]
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-500">Code</th>
            <th className="px-4 py-3 font-medium text-gray-500">Description</th>
            <th className="px-4 py-3 font-medium text-gray-500">Unit</th>
            <th className="px-4 py-3 font-medium text-gray-500 text-right">Price</th>
            <th className="px-4 py-3 font-medium text-gray-500 text-center">Tax</th>
            <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr
              key={item.id}
              className={`${!item.active ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}`}
            >
              {editingId === item.id ? (
                <>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{item.item_code}</td>
                  <td className="px-4 py-2">
                    <input
                      value={editData.description || ''}
                      onChange={e => onEditChange({ ...editData, description: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editData.unit || 'EA'}
                      onChange={e => onEditChange({ ...editData, unit: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editData.unit_price || 0}
                      onChange={e => onEditChange({ ...editData, unit_price: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={editData.is_taxable || false}
                      onChange={e => onEditChange({ ...editData, is_taxable: e.target.checked })}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button onClick={onSaveEdit} className="text-primary font-medium text-xs">Save</button>
                    <button onClick={onCancelEdit} className="text-gray-500 text-xs">Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.item_code}</td>
                  <td className="px-4 py-3 text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 text-right font-medium">${item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">{item.is_taxable ? '✓' : ''}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => onStartEdit(item)} className="text-primary text-xs font-medium">Edit</button>
                    <button
                      onClick={() => onToggleActive(item)}
                      className={`text-xs font-medium ${item.active ? 'text-red-500' : 'text-green-600'}`}
                    >
                      {item.active ? 'Deactivate' : 'Restore'}
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
