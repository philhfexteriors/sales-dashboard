'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface Category {
  id: string
  trade: string
  name: string
  description: string | null
  sort_order: number
  active: boolean
  variant_groups: string[] | null
}

interface PriceListItem {
  id: string
  trade: string
  section: string
  item_code?: string | null
  brand: string | null
  description: string
  unit: string
  unit_price: number
  is_taxable: boolean
  active: boolean
  sort_order: number
  notes: string | null
  category_id: string | null
  category: { id: string; name: string; variant_groups: string[] | null } | null
}

const DEFAULT_VARIANT_GROUPS = ['color', 'size', 'style']

interface Variant {
  id: string
  price_list_id: string
  name: string
  variant_group: string
  sort_order: number
  active: boolean
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

export default function ProductCatalogAdmin() {
  const [items, setItems] = useState<PriceListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTrade, setActiveTrade] = useState('roof')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<PriceListItem>>({})

  // Variants state
  const [expandedVariantsId, setExpandedVariantsId] = useState<string | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [newVariantNames, setNewVariantNames] = useState<Record<string, string>>({})

  // Add item form — tracks which section the form is open for (null = closed)
  const [addingToSection, setAddingToSection] = useState<'materials' | 'labor' | null>(null)
  const [newItem, setNewItem] = useState({
    brand: '',
    description: '',
    unit: 'EA',
    unit_price: 0,
    is_taxable: false,
    notes: '',
    category_id: null as string | null,
  })
  // Initial variants to create with a new item: { [group]: string[] }
  const [newItemVariants, setNewItemVariants] = useState<Record<string, string[]>>({})
  const [variantInput, setVariantInput] = useState<Record<string, string>>({})

  // Add category form
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryVariantGroups, setNewCategoryVariantGroups] = useState<string[]>(['color'])
  const [customGroupInput, setCustomGroupInput] = useState('')

  // Edit category
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/price-list/categories?trade=${activeTrade}&active=false`)
      if (res.ok) setCategories(await res.json())
    } catch {
      toast.error('Failed to load categories')
    }
  }, [activeTrade])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/price-list?trade=${activeTrade}&active=false`)
      if (res.ok) setItems(await res.json())
    } catch {
      toast.error('Failed to load items')
    }
    setLoading(false)
  }, [activeTrade])

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [fetchCategories, fetchItems])

  // Filter items by selected category
  const filteredItems = selectedCategoryId === 'uncategorized'
    ? items.filter(i => !i.category_id)
    : selectedCategoryId
      ? items.filter(i => i.category_id === selectedCategoryId)
      : items

  const materialItems = filteredItems.filter(i => i.section === 'materials')
  const laborItems = filteredItems.filter(i => i.section === 'labor')

  // --- Category actions ---
  async function addCategory() {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch('/api/price-list/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade: activeTrade, name: newCategoryName.trim(), sort_order: categories.length, variant_groups: newCategoryVariantGroups }),
      })
      if (res.ok) {
        toast.success('Category added')
        setNewCategoryName('')
        setNewCategoryVariantGroups(['color'])
        setCustomGroupInput('')
        setShowAddCategory(false)
        fetchCategories()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add')
      }
    } catch { toast.error('Failed to add category') }
  }

  async function saveCategory() {
    if (!editingCategoryId || !editCategoryName.trim()) return
    try {
      const res = await fetch(`/api/price-list/categories/${editingCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      })
      if (res.ok) {
        toast.success('Category updated')
        setEditingCategoryId(null)
        fetchCategories()
      }
    } catch { toast.error('Failed to update') }
  }

  async function toggleCategoryActive(cat: Category) {
    try {
      const res = await fetch(`/api/price-list/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !cat.active }),
      })
      if (res.ok) {
        toast.success(cat.active ? 'Category deactivated' : 'Category restored')
        fetchCategories()
      }
    } catch { toast.error('Failed to update') }
  }

  // --- Item actions ---
  function startEditing(item: PriceListItem) {
    setEditingId(item.id)
    setEditData({
      brand: item.brand,
      description: item.description,
      unit: item.unit,
      unit_price: item.unit_price,
      is_taxable: item.is_taxable,
      notes: item.notes,
      category_id: item.category_id,
    })
  }

  async function saveEdit() {
    if (!editingId) return
    try {
      const res = await fetch(`/api/price-list/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        toast.success('Item updated')
        setEditingId(null)
        fetchItems()
      } else { toast.error('Failed to update') }
    } catch { toast.error('Failed to update') }
  }

  async function toggleActive(item: PriceListItem) {
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
    } catch { toast.error('Failed to update') }
  }

  async function addItem() {
    if (!newItem.description || !addingToSection) {
      toast.error('Description is required')
      return
    }
    try {
      const res = await fetch('/api/price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          section: addingToSection,
          trade: activeTrade,
          sort_order: items.length,
          category_id: newItem.category_id ? newItem.category_id : (selectedCategoryId && selectedCategoryId !== 'uncategorized' ? selectedCategoryId : null),
        }),
      })
      if (res.ok) {
        const createdItem = await res.json()
        // Create initial variants if any were added
        const allVariantEntries = Object.entries(newItemVariants)
        for (const [group, names] of allVariantEntries) {
          for (let i = 0; i < names.length; i++) {
            await fetch('/api/price-list/variants', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                price_list_id: createdItem.id,
                name: names[i],
                variant_group: group,
                sort_order: i,
              }),
            })
          }
        }
        const variantCount = allVariantEntries.reduce((sum, [, names]) => sum + names.length, 0)
        toast.success(`Item added${variantCount > 0 ? ` with ${variantCount} variant${variantCount > 1 ? 's' : ''}` : ''}`)
        setAddingToSection(null)
        setNewItem({ brand: '', description: '', unit: 'EA', unit_price: 0, is_taxable: false, notes: '', category_id: null })
        setNewItemVariants({})
        setVariantInput({})
        fetchItems()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add')
      }
    } catch { toast.error('Failed to add') }
  }

  function openAddForm(section: 'materials' | 'labor') {
    setAddingToSection(section)
    setNewItem({ brand: '', description: '', unit: 'EA', unit_price: 0, is_taxable: false, notes: '', category_id: null })
    setNewItemVariants({})
    setVariantInput({})
  }

  function closeAddForm() {
    setAddingToSection(null)
    setNewItem({ brand: '', description: '', unit: 'EA', unit_price: 0, is_taxable: false, notes: '', category_id: null })
    setNewItemVariants({})
    setVariantInput({})
  }

  // --- Variant actions ---
  async function loadVariants(itemId: string) {
    if (expandedVariantsId === itemId) {
      setExpandedVariantsId(null)
      return
    }
    setExpandedVariantsId(itemId)
    setVariantsLoading(true)
    setNewVariantNames({})
    try {
      const res = await fetch(`/api/price-list/variants?price_list_id=${itemId}&active=false`)
      if (res.ok) setVariants(await res.json())
    } catch { setVariants([]) }
    setVariantsLoading(false)
  }

  async function refreshVariants(itemId: string) {
    try {
      const res = await fetch(`/api/price-list/variants?price_list_id=${itemId}&active=false`)
      if (res.ok) setVariants(await res.json())
    } catch { /* ignore */ }
  }

  async function addVariant(itemId: string, variantGroup: string = 'color') {
    const name = (newVariantNames[variantGroup] || '').trim()
    if (!name) return
    try {
      const res = await fetch('/api/price-list/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_list_id: itemId,
          name,
          variant_group: variantGroup,
          sort_order: variants.filter(v => v.variant_group === variantGroup).length,
        }),
      })
      if (res.ok) {
        toast.success('Variant added')
        setNewVariantNames(prev => ({ ...prev, [variantGroup]: '' }))
        refreshVariants(itemId)
      } else { toast.error('Failed to add variant') }
    } catch { toast.error('Failed to add variant') }
  }

  async function toggleVariantActive(v: Variant) {
    try {
      const res = await fetch(`/api/price-list/variants/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !v.active }),
      })
      if (res.ok) {
        toast.success(v.active ? 'Variant deactivated' : 'Variant restored')
        refreshVariants(v.price_list_id)
      }
    } catch { toast.error('Failed to update') }
  }

  async function deleteVariant(v: Variant) {
    try {
      const res = await fetch(`/api/price-list/variants/${v.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Variant deleted')
        refreshVariants(v.price_list_id)
      }
    } catch { toast.error('Failed to delete') }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'sales_manager']}>
      <AppShell>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
            <p className="text-sm text-gray-500 mt-1">Manage materials, labor, pricing, and variants</p>
          </div>

          {/* Trade tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
            {TRADES.map(t => (
              <button
                key={t.key}
                onClick={() => { setActiveTrade(t.key); setSelectedCategoryId(null); setExpandedVariantsId(null) }}
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

          {loading ? (
            <Loading message="Loading catalog..." />
          ) : (
            <div className="grid md:grid-cols-4 gap-6">
              {/* Category sidebar */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 self-start">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 text-sm">Categories</h2>
                  <button onClick={() => setShowAddCategory(!showAddCategory)} className="text-primary hover:text-primary-dark text-xs font-medium">+ Add</button>
                </div>

                {showAddCategory && (
                  <div className="mb-3 space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCategory()}
                        placeholder="Category name"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        autoFocus
                      />
                      <button onClick={addCategory} className="px-2 py-1.5 bg-primary text-white rounded-lg text-xs">Add</button>
                      <button onClick={() => { setShowAddCategory(false); setNewCategoryName(''); setNewCategoryVariantGroups(['color']); setCustomGroupInput('') }} className="px-2 py-1.5 text-gray-500 text-xs">✕</button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">Variant Attributes</label>
                      <div className="flex flex-wrap gap-1">
                        {DEFAULT_VARIANT_GROUPS.map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setNewCategoryVariantGroups(prev =>
                              prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                            )}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors capitalize ${
                              newCategoryVariantGroups.includes(g)
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-gray-50 border-gray-200 text-gray-400'
                            }`}
                          >
                            {newCategoryVariantGroups.includes(g) ? '✓ ' : ''}{g}
                          </button>
                        ))}
                        {newCategoryVariantGroups.filter(g => !DEFAULT_VARIANT_GROUPS.includes(g)).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setNewCategoryVariantGroups(prev => prev.filter(x => x !== g))}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium border bg-primary/10 border-primary/30 text-primary capitalize"
                          >
                            ✓ {g} ×
                          </button>
                        ))}
                        <div className="flex gap-0.5">
                          <input
                            value={customGroupInput}
                            onChange={e => setCustomGroupInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && customGroupInput.trim()) {
                                const g = customGroupInput.trim().toLowerCase()
                                if (!newCategoryVariantGroups.includes(g)) {
                                  setNewCategoryVariantGroups(prev => [...prev, g])
                                }
                                setCustomGroupInput('')
                              }
                            }}
                            placeholder="+ custom"
                            className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !selectedCategoryId ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Items <span className="text-xs text-gray-400">({items.length})</span>
                  </button>

                  {categories.map(cat => (
                    <div key={cat.id} className={`group rounded-lg ${!cat.active ? 'opacity-50' : ''}`}>
                      {editingCategoryId === cat.id ? (
                        <div className="flex gap-1 p-1.5">
                          <input
                            value={editCategoryName}
                            onChange={e => setEditCategoryName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveCategory(); if (e.key === 'Escape') setEditingCategoryId(null) }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            autoFocus
                          />
                          <button onClick={saveCategory} className="text-primary text-xs font-medium px-1">Save</button>
                          <button onClick={() => setEditingCategoryId(null)} className="text-gray-400 text-xs px-1">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedCategoryId === cat.id ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{cat.name}</span>
                            <span className="text-xs text-gray-400 ml-1">({items.filter(i => i.category_id === cat.id).length})</span>
                            {cat.variant_groups && cat.variant_groups.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {cat.variant_groups.map(g => (
                                  <span key={g} className="text-[9px] px-1 py-0 rounded bg-gray-100 text-gray-400 capitalize">{g}</span>
                                ))}
                              </div>
                            )}
                          </button>
                          <div className="hidden group-hover:flex items-center gap-0.5 mr-1">
                            <button
                              onClick={() => { setEditingCategoryId(cat.id); setEditCategoryName(cat.name) }}
                              className="text-gray-300 hover:text-gray-500 p-1"
                              title="Rename"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => toggleCategoryActive(cat)}
                              className={`text-xs px-1.5 py-0.5 rounded ${cat.active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            >
                              {cat.active ? 'Off' : 'On'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {items.some(i => !i.category_id) && (
                    <button
                      onClick={() => setSelectedCategoryId('uncategorized')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategoryId === 'uncategorized' ? 'bg-primary/10 text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Uncategorized <span className="text-xs text-gray-400">({items.filter(i => !i.category_id).length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items area */}
              <div className="md:col-span-3 space-y-8">
                <ItemSection
                  title="Materials"
                  sectionKey="materials"
                  items={materialItems}
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  editingId={editingId}
                  editData={editData}
                  onStartEdit={startEditing}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onEditChange={setEditData}
                  onToggleActive={toggleActive}
                  expandedVariantsId={expandedVariantsId}
                  variants={variants}
                  variantsLoading={variantsLoading}
                  onToggleVariants={loadVariants}
                  newVariantNames={newVariantNames}
                  onNewVariantNameChange={(group, name) => setNewVariantNames(prev => ({ ...prev, [group]: name }))}
                  onAddVariant={addVariant}
                  onToggleVariantActive={toggleVariantActive}
                  onDeleteVariant={deleteVariant}
                  showAddForm={addingToSection === 'materials'}
                  onOpenAddForm={() => openAddForm('materials')}
                  onCloseAddForm={closeAddForm}
                  newItem={newItem}
                  onNewItemChange={setNewItem}
                  onAddItem={addItem}
                  newItemVariants={newItemVariants}
                  onNewItemVariantsChange={setNewItemVariants}
                  variantInput={variantInput}
                  onVariantInputChange={setVariantInput}
                />
                <ItemSection
                  title="Labor"
                  sectionKey="labor"
                  items={laborItems}
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  editingId={editingId}
                  editData={editData}
                  onStartEdit={startEditing}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onEditChange={setEditData}
                  onToggleActive={toggleActive}
                  expandedVariantsId={expandedVariantsId}
                  variants={variants}
                  variantsLoading={variantsLoading}
                  onToggleVariants={loadVariants}
                  newVariantNames={newVariantNames}
                  onNewVariantNameChange={(group, name) => setNewVariantNames(prev => ({ ...prev, [group]: name }))}
                  onAddVariant={addVariant}
                  onToggleVariantActive={toggleVariantActive}
                  onDeleteVariant={deleteVariant}
                  showAddForm={addingToSection === 'labor'}
                  onOpenAddForm={() => openAddForm('labor')}
                  onCloseAddForm={closeAddForm}
                  newItem={newItem}
                  onNewItemChange={setNewItem}
                  onAddItem={addItem}
                  newItemVariants={newItemVariants}
                  onNewItemVariantsChange={setNewItemVariants}
                  variantInput={variantInput}
                  onVariantInputChange={setVariantInput}
                />
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  )
}

interface NewItemData {
  brand: string
  description: string
  unit: string
  unit_price: number
  is_taxable: boolean
  notes: string
  category_id: string | null
}

interface ItemSectionProps {
  title: string
  sectionKey: 'materials' | 'labor'
  items: PriceListItem[]
  categories: Category[]
  selectedCategoryId: string | null
  editingId: string | null
  editData: Partial<PriceListItem>
  onStartEdit: (item: PriceListItem) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditChange: (data: Partial<PriceListItem>) => void
  onToggleActive: (item: PriceListItem) => void
  expandedVariantsId: string | null
  variants: Variant[]
  variantsLoading: boolean
  onToggleVariants: (itemId: string) => void
  newVariantNames: Record<string, string>
  onNewVariantNameChange: (group: string, name: string) => void
  onAddVariant: (itemId: string, variantGroup: string) => void
  onToggleVariantActive: (v: Variant) => void
  onDeleteVariant: (v: Variant) => void
  showAddForm: boolean
  onOpenAddForm: () => void
  onCloseAddForm: () => void
  newItem: NewItemData
  onNewItemChange: (data: NewItemData) => void
  onAddItem: () => void
  newItemVariants: Record<string, string[]>
  onNewItemVariantsChange: (v: Record<string, string[]>) => void
  variantInput: Record<string, string>
  onVariantInputChange: (v: Record<string, string>) => void
}

function ItemSection({ title, sectionKey, items, categories, selectedCategoryId, showAddForm, onOpenAddForm, onCloseAddForm, newItem, onNewItemChange, onAddItem, newItemVariants, onNewItemVariantsChange, variantInput, onVariantInputChange, ...props }: ItemSectionProps) {
  // Get variant groups for the selected category
  const selectedCategory = newItem.category_id ? categories.find(c => c.id === newItem.category_id) : null
  const variantGroups = selectedCategory?.variant_groups ?? []

  function addVariantChip(group: string) {
    const val = (variantInput[group] || '').trim()
    if (!val) return
    const existing = newItemVariants[group] || []
    if (existing.includes(val)) return
    onNewItemVariantsChange({ ...newItemVariants, [group]: [...existing, val] })
    onVariantInputChange({ ...variantInput, [group]: '' })
  }

  function removeVariantChip(group: string, name: string) {
    const existing = newItemVariants[group] || []
    onNewItemVariantsChange({ ...newItemVariants, [group]: existing.filter(n => n !== name) })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>

      {items.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 py-4">No {title.toLowerCase()} items{selectedCategoryId ? ' in this category' : ''} yet.</p>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-3 font-medium text-gray-500 w-8"></th>
                <th className="px-3 py-3 font-medium text-gray-500">Brand</th>
                <th className="px-3 py-3 font-medium text-gray-500">Line</th>
                <th className="px-3 py-3 font-medium text-gray-500">Unit</th>
                <th className="px-3 py-3 font-medium text-gray-500 text-right">Price</th>
                <th className="px-3 py-3 font-medium text-gray-500 text-center">Tax</th>
                <th className="px-3 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <ItemRow key={item.id} item={item} categories={categories} {...props} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm ? (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3 text-sm">Add {title} Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={newItem.category_id || ''} onChange={e => onNewItemChange({ ...newItem, category_id: e.target.value || null })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Uncategorized</option>
                {categories.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
              <input value={newItem.brand} onChange={e => onNewItemChange({ ...newItem, brand: e.target.value })} placeholder="e.g., CertainTeed, GAF, OC" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Line</label>
              <input value={newItem.description} onChange={e => onNewItemChange({ ...newItem, description: e.target.value })} placeholder={sectionKey === 'materials' ? 'e.g., Landmark Pro Shingles' : 'e.g., Tear Off (per SQ)'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <select value={newItem.unit} onChange={e => onNewItemChange({ ...newItem, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
              <input type="number" step="0.01" value={newItem.unit_price} onChange={e => onNewItemChange({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newItem.is_taxable} onChange={e => onNewItemChange({ ...newItem, is_taxable: e.target.checked })} className="rounded" />
                Taxable
              </label>
            </div>
          </div>

          {/* Variant inputs — shown when category has variant groups */}
          {variantGroups.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              {variantGroups.map(group => {
                const chips = newItemVariants[group] || []
                const input = variantInput[group] || ''
                return (
                  <div key={group} className="mb-3 last:mb-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5 capitalize">{group}s</label>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {chips.map(name => (
                          <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                            {name}
                            <button type="button" onClick={() => removeVariantChip(group, name)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={input}
                        onChange={e => onVariantInputChange({ ...variantInput, [group]: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariantChip(group) } }}
                        placeholder={`Type a ${group} and press Enter...`}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 max-w-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button type="button" onClick={() => addVariantChip(group)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Add</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
            <button onClick={onAddItem} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium">Add Item</button>
            <button onClick={onCloseAddForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenAddForm}
          className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
        >
          + Add {title} Item
        </button>
      )}
    </div>
  )
}

function ItemRow({
  item, categories, editingId, editData, onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onToggleActive,
  expandedVariantsId, variants, variantsLoading, onToggleVariants, newVariantNames, onNewVariantNameChange,
  onAddVariant, onToggleVariantActive, onDeleteVariant,
}: {
  item: PriceListItem
  categories: Category[]
  editingId: string | null
  editData: Partial<PriceListItem>
  onStartEdit: (item: PriceListItem) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditChange: (data: Partial<PriceListItem>) => void
  onToggleActive: (item: PriceListItem) => void
  expandedVariantsId: string | null
  variants: Variant[]
  variantsLoading: boolean
  onToggleVariants: (itemId: string) => void
  newVariantNames: Record<string, string>
  onNewVariantNameChange: (group: string, name: string) => void
  onAddVariant: (itemId: string, variantGroup: string) => void
  onToggleVariantActive: (v: Variant) => void
  onDeleteVariant: (v: Variant) => void
}) {
  const isEditing = editingId === item.id
  const isExpanded = expandedVariantsId === item.id

  return (
    <>
      <tr className={`${!item.active ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}`}>
        <td className="px-3 py-3">
          <button onClick={() => onToggleVariants(item.id)} className="text-gray-400 hover:text-gray-600" title="Manage variants">
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </td>
        {isEditing ? (
          <>
            <td className="px-3 py-2">
              <input value={editData.brand || ''} onChange={e => onEditChange({ ...editData, brand: e.target.value || null })} placeholder="Brand" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
            </td>
            <td className="px-3 py-2">
              <input value={editData.description || ''} onChange={e => onEditChange({ ...editData, description: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
            </td>
            <td className="px-3 py-2">
              <select value={editData.unit || 'EA'} onChange={e => onEditChange({ ...editData, unit: e.target.value })} className="px-2 py-1 border border-gray-300 rounded text-sm">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </td>
            <td className="px-3 py-2">
              <input type="number" step="0.01" value={editData.unit_price || 0} onChange={e => onEditChange({ ...editData, unit_price: parseFloat(e.target.value) || 0 })} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
            </td>
            <td className="px-3 py-2 text-center">
              <input type="checkbox" checked={editData.is_taxable || false} onChange={e => onEditChange({ ...editData, is_taxable: e.target.checked })} className="rounded" />
            </td>
            <td className="px-3 py-2 text-right space-x-2">
              <button onClick={onSaveEdit} className="text-primary font-medium text-xs">Save</button>
              <button onClick={onCancelEdit} className="text-gray-500 text-xs">Cancel</button>
            </td>
          </>
        ) : (
          <>
            <td className="px-3 py-3">
              {item.brand ? <span className="font-medium text-gray-900">{item.brand}</span> : <span className="text-xs text-gray-400">&mdash;</span>}
            </td>
            <td className="px-3 py-3 text-gray-900">{item.description}</td>
            <td className="px-3 py-3 text-gray-600">{item.unit}</td>
            <td className="px-3 py-3 text-right font-medium">${item.unit_price.toFixed(2)}</td>
            <td className="px-3 py-3 text-center">{item.is_taxable ? '✓' : ''}</td>
            <td className="px-3 py-3 text-right space-x-2">
              <button onClick={() => onStartEdit(item)} className="text-primary text-xs font-medium">Edit</button>
              <button onClick={() => onToggleActive(item)} className={`text-xs font-medium ${item.active ? 'text-red-500' : 'text-green-600'}`}>
                {item.active ? 'Deactivate' : 'Restore'}
              </button>
            </td>
          </>
        )}
      </tr>

      {/* Inline variant chips row — always shown if item has variant groups */}
      {!isEditing && (() => {
        const variantGroups = item.category?.variant_groups ?? ['color']
        if (variantGroups.length === 0) return null
        // Only show if expanded OR variants have been loaded for this item
        const itemVariants = isExpanded ? variants : []
        const activeCount = itemVariants.filter(v => v.active).length
        const totalCount = itemVariants.length
        if (!isExpanded) {
          return (
            <tr className={`${!item.active ? 'opacity-50' : ''}`}>
              <td />
              <td colSpan={6} className="px-3 pb-2 pt-0">
                <button
                  onClick={() => onToggleVariants(item.id)}
                  className="text-xs text-gray-400 hover:text-primary transition-colors"
                >
                  {variantGroups.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')} — click to manage
                </button>
              </td>
            </tr>
          )
        }
        return null
      })()}

      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-blue-50/50 px-6 py-3">
            {variantsLoading ? (
              <p className="text-xs text-gray-500">Loading variants...</p>
            ) : (
              <div>
                {(() => {
                  const variantGroups = item.category?.variant_groups ?? ['color']
                  if (variantGroups.length === 0) {
                    return (
                      <p className="text-xs text-gray-400 italic">This category has no variant attributes configured.</p>
                    )
                  }
                  return variantGroups.map(group => {
                    const groupVariants = variants.filter(v => v.variant_group === group)
                    const inputValue = newVariantNames[group] || ''
                    return (
                      <div key={group} className="mb-3 last:mb-0">
                        <h4 className="text-xs font-semibold text-gray-700 mb-1.5 capitalize">
                          {group} <span className="font-normal text-gray-400">({groupVariants.filter(v => v.active).length} active, {groupVariants.length} total)</span>
                        </h4>
                        {groupVariants.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {groupVariants.map(v => (
                              <span key={v.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${v.active ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'}`}>
                                {v.name}
                                <button onClick={() => onToggleVariantActive(v)} className={`ml-0.5 ${v.active ? 'text-gray-400 hover:text-amber-600' : 'text-green-600 hover:text-green-700'}`} title={v.active ? 'Mark unavailable' : 'Mark available'}>
                                  {v.active ? '○' : '●'}
                                </button>
                                {!v.active && (
                                  <button onClick={() => onDeleteVariant(v)} className="text-red-400 hover:text-red-600 ml-0.5" title="Delete permanently">
                                    ✕
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            value={inputValue}
                            onChange={e => onNewVariantNameChange(group, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && onAddVariant(item.id, group)}
                            placeholder={`Add ${group}...`}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs flex-1 max-w-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <button onClick={() => onAddVariant(item.id, group)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium">Add</button>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
