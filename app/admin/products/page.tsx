'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface SubFieldConfig {
  key: string
  label: string
  type: string
  show_when?: Record<string, string | boolean>
}

interface CategoryConfig {
  sub_fields?: SubFieldConfig[]
  linked_to?: string
  match_from?: string
  price_reminder?: boolean
  price_reminder_text?: string
}

interface Category {
  id: string
  section: string
  name: string
  field_key: string | null
  field_type: string
  cascade_levels: number
  level_labels: string[] | null
  allow_custom: boolean
  allow_deselect: boolean
  config: CategoryConfig | null
  sort_order: number
  active: boolean
}

interface Option {
  id: string
  category_id: string
  parent_id: string | null
  level: number
  name: string
  notes: string | null
  sort_order: number
  active: boolean
}

const SECTIONS = [
  { key: 'roof', label: 'Roof' },
  { key: 'siding', label: 'Siding' },
  { key: 'guttering', label: 'Guttering' },
  { key: 'windows', label: 'Windows' },
  { key: 'small_jobs', label: 'Small Jobs' },
]

const FIELD_TYPES = [
  { value: 'cascade', label: 'Cascade (Brand/Line/Color)', icon: '🔗' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'radio', label: 'Radio (Pick One)', icon: '🔘' },
  { value: 'checkbox', label: 'Checkbox (Pick Multiple)', icon: '☑️' },
  { value: 'count', label: 'Counter', icon: '#' },
  { value: 'text', label: 'Text Input', icon: 'Aa' },
]

type FilterMode = 'active' | 'inactive' | 'all'

export default function ProductsAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('roof')
  const [filterMode, setFilterMode] = useState<FilterMode>('active')

  // New option form
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionParentId, setNewOptionParentId] = useState<string | null>(null)
  const [newOptionLevel, setNewOptionLevel] = useState(0)
  const [newOptionNotes, setNewOptionNotes] = useState('')
  const [showNewOption, setShowNewOption] = useState(false)

  // New field form
  const [showNewField, setShowNewField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/products/categories')
    const data = await res.json()
    setCategories(data || [])
    return data as Category[]
  }, [])

  useEffect(() => {
    fetchCategories().then(() => setLoading(false))
  }, [fetchCategories])

  async function fetchOptions(categoryId: string) {
    setOptionsLoading(true)
    const res = await fetch(`/api/products/options?category_id=${categoryId}&all=true`)
    const data = await res.json()
    setOptions(data || [])
    setOptionsLoading(false)
  }

  async function createOption() {
    if (!newOptionName.trim() || !selectedCategory) return
    const res = await fetch('/api/products/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: selectedCategory.id,
        parent_id: newOptionParentId,
        level: newOptionLevel,
        name: newOptionName.trim(),
        notes: newOptionNotes || null,
      }),
    })
    if (res.ok) {
      toast.success('Option added')
      setNewOptionName('')
      setNewOptionNotes('')
      setShowNewOption(false)
      fetchOptions(selectedCategory.id)
    } else {
      toast.error('Failed to add option')
    }
  }

  async function createField() {
    if (!newFieldName.trim()) return
    const fieldKey = newFieldKey.trim() || newFieldName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const sectionCats = categories.filter(c => c.section === activeSection)
    const maxSort = sectionCats.reduce((max, c) => Math.max(max, c.sort_order), -1) + 1

    const cascadeLevels = newFieldType === 'cascade' ? 3 : 1
    const levelLabels = newFieldType === 'cascade' ? ['Brand', 'Line', 'Color'] : null

    const res = await fetch('/api/products/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: activeSection,
        name: newFieldName.trim(),
        field_key: fieldKey,
        field_type: newFieldType,
        cascade_levels: cascadeLevels,
        level_labels: levelLabels,
        sort_order: maxSort,
      }),
    })
    if (res.ok) {
      toast.success('Field added')
      setNewFieldName('')
      setNewFieldKey('')
      setNewFieldType('text')
      setShowNewField(false)
      fetchCategories()
    } else {
      toast.error('Failed to add field')
    }
  }

  async function toggleCategoryActive(cat: Category) {
    const res = await fetch(`/api/products/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !cat.active }),
    })
    if (res.ok) {
      toast.success(cat.active ? 'Deactivated' : 'Activated')
      fetchCategories()
    } else {
      toast.error('Failed to update')
    }
  }

  async function updateCategoryFieldType(cat: Category, newType: string) {
    const updates: Record<string, unknown> = { field_type: newType }
    // Auto-set cascade_levels for cascade type
    if (newType === 'cascade' && cat.cascade_levels < 2) {
      updates.cascade_levels = 3
      updates.level_labels = ['Brand', 'Line', 'Color']
    }
    const res = await fetch(`/api/products/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      toast.success('Field type updated')
      fetchCategories()
      // Update selected if it's the same category
      if (selectedCategory?.id === cat.id) {
        const updated = await res.json()
        setSelectedCategory(updated)
      }
    } else {
      toast.error('Failed to update')
    }
  }

  async function updateCategoryCascadeLevels(cat: Category, levels: number) {
    const res = await fetch(`/api/products/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cascade_levels: levels }),
    })
    if (res.ok) {
      toast.success('Levels updated')
      fetchCategories()
      if (selectedCategory?.id === cat.id) {
        const updated = await res.json()
        setSelectedCategory(updated)
      }
    }
  }

  async function updateCategoryProperty(cat: Category, prop: string, value: unknown) {
    const res = await fetch(`/api/products/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [prop]: value }),
    })
    if (res.ok) {
      fetchCategories()
      if (selectedCategory?.id === cat.id) {
        const updated = await res.json()
        setSelectedCategory(updated)
      }
    }
  }

  async function moveCategorySort(cat: Category, direction: 'up' | 'down') {
    const sectionCats = categories
      .filter(c => c.section === activeSection)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = sectionCats.findIndex(c => c.id === cat.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sectionCats.length) return

    const other = sectionCats[swapIdx]
    // Swap sort_order values
    await Promise.all([
      fetch(`/api/products/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: other.sort_order }),
      }),
      fetch(`/api/products/categories/${other.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: cat.sort_order }),
      }),
    ])
    fetchCategories()
  }

  async function toggleOptionActive(option: Option) {
    const res = await fetch(`/api/products/options/${option.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !option.active }),
    })
    if (res.ok) {
      toast.success(option.active ? 'Deactivated' : 'Activated')
      if (selectedCategory) fetchOptions(selectedCategory.id)
    }
  }

  async function renameOption(option: Option, newName: string) {
    if (!newName.trim() || newName.trim() === option.name) return
    const res = await fetch(`/api/products/options/${option.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      toast.success('Renamed')
      if (selectedCategory) fetchOptions(selectedCategory.id)
    } else {
      toast.error('Failed to rename')
    }
  }

  async function deleteOption(option: Option) {
    const children = options.filter(o => o.parent_id === option.id)
    const msg = children.length > 0
      ? `Delete "${option.name}" and its ${children.length} child option${children.length > 1 ? 's' : ''}? This cannot be undone.`
      : `Delete "${option.name}"? This cannot be undone.`
    if (!confirm(msg)) return

    // Delete children first (they have FK to parent)
    for (const child of children) {
      // Recursively get grandchildren
      const grandchildren = options.filter(o => o.parent_id === child.id)
      for (const gc of grandchildren) {
        await fetch(`/api/products/options/${gc.id}`, { method: 'DELETE' })
      }
      await fetch(`/api/products/options/${child.id}`, { method: 'DELETE' })
    }

    const res = await fetch(`/api/products/options/${option.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      if (selectedCategory) fetchOptions(selectedCategory.id)
    } else {
      toast.error('Failed to delete')
    }
  }

  async function renameCategory(cat: Category, newName: string) {
    if (!newName.trim() || newName.trim() === cat.name) return
    const res = await fetch(`/api/products/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      toast.success('Renamed')
      fetchCategories()
      if (selectedCategory?.id === cat.id) {
        const updated = await res.json()
        setSelectedCategory(updated)
      }
    } else {
      toast.error('Failed to rename')
    }
  }

  async function deleteCategory(cat: Category) {
    const optCount = options.filter(o => o.category_id === cat.id).length
    const msg = optCount > 0
      ? `Delete "${cat.name}" and all its ${optCount} option${optCount > 1 ? 's' : ''}? This cannot be undone.`
      : `Delete "${cat.name}"? This cannot be undone.`
    if (!confirm(msg)) return

    const res = await fetch(`/api/products/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      if (selectedCategory?.id === cat.id) {
        setSelectedCategory(null)
        setOptions([])
      }
      fetchCategories()
    } else {
      toast.error('Failed to delete')
    }
  }

  function selectCategory(cat: Category) {
    setSelectedCategory(cat)
    fetchOptions(cat.id)
    setShowNewOption(false)
  }

  // Filter categories for current section
  const sectionCategories = categories
    .filter(c => c.section === activeSection)
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter(cat => {
      if (filterMode === 'active') return cat.active
      if (filterMode === 'inactive') return !cat.active
      return true
    })

  // Level labels for the selected category
  const levelLabels: string[] = selectedCategory?.level_labels || ['Brand / Type', 'Line / Model', 'Color / Variant']
  const maxLevels = selectedCategory?.cascade_levels || 3

  // Filter options by active status
  const filteredOptions = options.filter(o => {
    if (filterMode === 'active') return o.active
    if (filterMode === 'inactive') return !o.active
    return true
  })

  // Build tree from filtered options
  const rootOptions = filteredOptions.filter(o => !o.parent_id)
  const getChildren = (parentId: string) => filteredOptions.filter(o => o.parent_id === parentId)

  // Field type badge
  function FieldTypeBadge({ type }: { type: string }) {
    const ft = FIELD_TYPES.find(f => f.value === type)
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
        {ft?.icon || '?'} {ft?.label?.split(' (')[0] || type}
      </span>
    )
  }

  // Determine if category needs product_options tree (cascade, select, radio, checkbox have options; count and text don't)
  const needsOptions = selectedCategory && ['cascade', 'select', 'radio', 'checkbox'].includes(selectedCategory.field_type)

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Deprecation banner */}
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Legacy Plan Fields</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This page manages production plan form fields. For pricing, catalog items, and variants, use the{' '}
                <a href="/admin/price-list" className="underline font-medium hover:text-amber-900">Product Catalog</a>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Plan Fields (Legacy)</h1>

            {/* Active/Inactive filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {([
                { key: 'active', label: 'Active' },
                { key: 'all', label: 'All' },
                { key: 'inactive', label: 'Inactive' },
              ] as { key: FilterMode; label: string }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterMode(f.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterMode === f.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => { setActiveSection(s.key); setSelectedCategory(null); setOptions([]) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <Loading message="Loading catalog..." />
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Fields column */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Fields</h2>
                  <button
                    onClick={() => setShowNewField(!showNewField)}
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                  >
                    + Add Field
                  </button>
                </div>

                {/* New field form */}
                {showNewField && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={e => {
                        setNewFieldName(e.target.value)
                        if (!newFieldKey) {
                          // Auto-generate key from name
                        }
                      }}
                      placeholder="Field name (e.g., Ridge Cap)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newFieldKey}
                      onChange={e => setNewFieldKey(e.target.value)}
                      placeholder={`Key (auto: ${newFieldName.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'field_key'})`}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-500"
                    />
                    <select
                      value={newFieldType}
                      onChange={e => setNewFieldType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                    >
                      {FIELD_TYPES.map(ft => (
                        <option key={ft.value} value={ft.value}>{ft.icon} {ft.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={createField}
                        className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowNewField(false)}
                        className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {sectionCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    {filterMode === 'inactive' ? 'No inactive fields' : 'No fields configured. Add one above.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sectionCategories.map((cat, idx) => (
                      <FieldItem
                        key={cat.id}
                        cat={cat}
                        idx={idx}
                        total={sectionCategories.length}
                        isSelected={selectedCategory?.id === cat.id}
                        onSelect={() => selectCategory(cat)}
                        onToggleActive={() => toggleCategoryActive(cat)}
                        onMoveUp={() => moveCategorySort(cat, 'up')}
                        onMoveDown={() => moveCategorySort(cat, 'down')}
                        onRename={(newName) => renameCategory(cat, newName)}
                        onDelete={() => deleteCategory(cat)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Options/settings panel (2 columns wide) */}
              <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
                {!selectedCategory ? (
                  <p className="text-sm text-gray-400 py-8 text-center">Select a field to manage its settings and options</p>
                ) : (
                  <>
                    {/* Field settings header */}
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-900">{selectedCategory.name}</h2>
                        <span className="text-xs text-gray-400 font-mono">{selectedCategory.field_key}</span>
                      </div>

                      {/* Field type selector */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <label className="text-xs font-medium text-gray-500 w-full">Field Type:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {FIELD_TYPES.map(ft => (
                            <button
                              key={ft.value}
                              onClick={() => updateCategoryFieldType(selectedCategory, ft.value)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                selectedCategory.field_type === ft.value
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {ft.icon} {ft.label.split(' (')[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cascade-specific settings */}
                      {selectedCategory.field_type === 'cascade' && (
                        <div className="flex items-center gap-3 mb-3">
                          <label className="text-xs font-medium text-gray-500">Levels:</label>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(n => (
                              <button
                                key={n}
                                onClick={() => updateCategoryCascadeLevels(selectedCategory, n)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium border ${
                                  selectedCategory.cascade_levels === n
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Toggle properties */}
                      <div className="flex flex-wrap gap-4">
                        {(selectedCategory.field_type === 'select' || selectedCategory.field_type === 'text') && (
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCategory.allow_custom}
                              onChange={e => updateCategoryProperty(selectedCategory, 'allow_custom', e.target.checked)}
                              className="rounded"
                            />
                            Allow custom entry
                          </label>
                        )}
                        {selectedCategory.field_type === 'radio' && (
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCategory.allow_deselect}
                              onChange={e => updateCategoryProperty(selectedCategory, 'allow_deselect', e.target.checked)}
                              className="rounded"
                            />
                            Allow deselect
                          </label>
                        )}
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategory.config?.price_reminder || false}
                            onChange={e => {
                              const newConfig = { ...(selectedCategory.config || {}), price_reminder: e.target.checked }
                              updateCategoryProperty(selectedCategory, 'config', newConfig)
                            }}
                            className="rounded"
                          />
                          Price reminder popup
                        </label>
                      </div>

                      {/* Price reminder text (shown when price_reminder is enabled) */}
                      {selectedCategory.config?.price_reminder && (
                        <div className="mt-3">
                          <label className="text-xs font-medium text-gray-500 block mb-1">Reminder text:</label>
                          <input
                            type="text"
                            value={selectedCategory.config?.price_reminder_text || ''}
                            onChange={e => {
                              const newConfig = { ...(selectedCategory.config || {}), price_reminder_text: e.target.value }
                              updateCategoryProperty(selectedCategory, 'config', newConfig)
                            }}
                            placeholder={`Don't forget to add a price for ${selectedCategory.name}.`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      )}
                    </div>

                    {/* Options tree - only for types that use product_options */}
                    {needsOptions ? (
                      optionsLoading ? (
                        <Loading message="Loading options..." />
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-700">Options</h3>
                            <button
                              onClick={() => {
                                setShowNewOption(true)
                                setNewOptionParentId(null)
                                setNewOptionLevel(0)
                                setNewOptionNotes('')
                              }}
                              className="text-primary hover:text-primary-dark text-sm font-medium"
                            >
                              + Add {levelLabels[0] || 'Option'}
                            </button>
                          </div>

                          {showNewOption && (
                            <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                              <input
                                type="text"
                                value={newOptionName}
                                onChange={e => setNewOptionName(e.target.value)}
                                placeholder={`${levelLabels[newOptionLevel] || 'Option'} name`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                onKeyDown={e => e.key === 'Enter' && createOption()}
                                autoFocus
                              />
                              {/* Notes field for sub-field grouping */}
                              {selectedCategory.config?.sub_fields && selectedCategory.config.sub_fields.length > 0 && (
                                <select
                                  value={newOptionNotes}
                                  onChange={e => setNewOptionNotes(e.target.value)}
                                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                  <option value="">Main option</option>
                                  {selectedCategory.config.sub_fields.map((sf) => (
                                    <option key={sf.key} value={`sub:${sf.key}`}>{sf.label} option</option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={createOption}
                                className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setShowNewOption(false)}
                                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {rootOptions.length === 0 ? (
                            <p className="text-sm text-gray-400 py-8 text-center">
                              {filterMode === 'inactive'
                                ? 'No inactive options'
                                : `No options yet. Add a ${levelLabels[0] || 'option'} to get started.`
                              }
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {rootOptions.map(opt => (
                                <OptionNode
                                  key={opt.id}
                                  option={opt}
                                  getChildren={getChildren}
                                  onToggleActive={toggleOptionActive}
                                  onRename={renameOption}
                                  onDelete={deleteOption}
                                  onAddChild={(parentId, level) => {
                                    setNewOptionParentId(parentId)
                                    setNewOptionLevel(level)
                                    setShowNewOption(true)
                                    setNewOptionName('')
                                    setNewOptionNotes('')
                                  }}
                                  levelLabels={levelLabels}
                                  maxLevels={maxLevels}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-400">
                          {selectedCategory.field_type === 'count'
                            ? 'Counter fields don\'t need product options. Users enter a number directly.'
                            : 'Text fields don\'t need product options. Users type freely.'}
                        </p>
                        {selectedCategory.config?.sub_fields && selectedCategory.config.sub_fields.length > 0 && (
                          <p className="text-xs text-gray-400 mt-2">
                            This field has sub-fields: {selectedCategory.config.sub_fields.map(sf => sf.label).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </AppShell>
  )
}

// Inline-editable field item in the sidebar
function FieldItem({
  cat,
  idx,
  total,
  isSelected,
  onSelect,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
}: {
  cat: Category
  idx: number
  total: number
  isSelected: boolean
  onSelect: () => void
  onToggleActive: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRename: (newName: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(cat.name)

  const ft = FIELD_TYPES.find(f => f.value === cat.field_type)

  function handleSaveEdit() {
    onRename(editName)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-lg bg-primary/10 p-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') { setEditing(false); setEditName(cat.name) }
            }}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button onClick={handleSaveEdit} className="px-2 py-1.5 bg-primary text-white rounded text-xs">Save</button>
          <button onClick={() => { setEditing(false); setEditName(cat.name) }} className="px-2 py-1.5 text-gray-500 text-xs">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg transition-colors group/field ${
        isSelected ? 'bg-primary/10' : 'hover:bg-gray-50'
      } ${!cat.active ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-1">
        {/* Sort arrows */}
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button onClick={onMoveDown} disabled={idx === total - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 p-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <button onClick={onSelect} className={`flex-1 text-left px-2 py-2 text-sm min-w-0 ${isSelected ? 'text-primary font-medium' : 'text-gray-700'}`}>
          <div className="flex items-center gap-2">
            <span className="truncate">{cat.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap shrink-0">
              {ft?.icon || '?'} {ft?.label?.split(' (')[0] || cat.field_type}
            </span>
          </div>
        </button>

        {/* Edit + Delete — visible on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(cat.name) }}
          className="text-gray-300 hover:text-gray-500 p-1 opacity-0 group-hover/field:opacity-100 transition-opacity"
          title="Edit name"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover/field:opacity-100 transition-opacity"
          title="Delete field"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleActive() }}
          className={`text-xs px-2 py-0.5 rounded mr-1 shrink-0 ${
            cat.active
              ? 'text-green-700 bg-green-50 hover:bg-green-100'
              : 'text-red-700 bg-red-50 hover:bg-red-100'
          }`}
        >
          {cat.active ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  )
}

// Option tree node with inline edit + delete
function OptionNode({
  option,
  getChildren,
  onToggleActive,
  onRename,
  onDelete,
  onAddChild,
  levelLabels,
  maxLevels,
  depth = 0,
}: {
  option: Option
  getChildren: (parentId: string) => Option[]
  onToggleActive: (opt: Option) => void
  onRename: (opt: Option, newName: string) => void
  onDelete: (opt: Option) => void
  onAddChild: (parentId: string, level: number) => void
  levelLabels: string[]
  maxLevels: number
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(option.name)
  const children = getChildren(option.id)
  const nextLevel = option.level + 1
  const canHaveChildren = nextLevel < maxLevels

  function handleSaveEdit() {
    onRename(option, editName)
    setEditing(false)
  }

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-3' : ''}>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg group hover:bg-gray-50 ${!option.active ? 'opacity-50' : ''}`}>
        {children.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 shrink-0">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {editing ? (
          <div className="flex-1 flex gap-1.5">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveEdit()
                if (e.key === 'Escape') { setEditing(false); setEditName(option.name) }
              }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            <button onClick={handleSaveEdit} className="px-2 py-1 bg-primary text-white rounded text-xs">Save</button>
            <button onClick={() => { setEditing(false); setEditName(option.name) }} className="px-2 py-1 text-gray-500 text-xs">Cancel</button>
          </div>
        ) : (
          <>
            <span className={`flex-1 text-sm ${depth === 0 ? 'font-medium' : ''}`}>
              {option.name}
            </span>

            {option.notes && (
              <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                {option.notes}
              </span>
            )}

            <span className="text-xs text-gray-400 hidden group-hover:inline">
              {levelLabels[option.level] || ''}
            </span>

            {canHaveChildren && (
              <button
                onClick={() => onAddChild(option.id, nextLevel)}
                className="text-xs text-primary hover:text-primary-dark opacity-0 group-hover:opacity-100 transition-opacity"
              >
                + {levelLabels[nextLevel] || 'Child'}
              </button>
            )}

            {/* Edit button */}
            <button
              onClick={() => { setEditing(true); setEditName(option.name) }}
              className="text-gray-300 hover:text-gray-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit name"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* Delete button */}
            <button
              onClick={() => onDelete(option)}
              className="text-gray-300 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <button
              onClick={() => onToggleActive(option)}
              className={`text-xs px-2 py-0.5 rounded ${
                option.active
                  ? 'text-green-700 bg-green-50 hover:bg-green-100'
                  : 'text-red-700 bg-red-50 hover:bg-red-100'
              }`}
            >
              {option.active ? 'Active' : 'Inactive'}
            </button>
          </>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="space-y-0.5">
          {children.map(child => (
            <OptionNode
              key={child.id}
              option={child}
              getChildren={getChildren}
              onToggleActive={onToggleActive}
              onRename={onRename}
              onDelete={onDelete}
              onAddChild={onAddChild}
              levelLabels={levelLabels}
              maxLevels={maxLevels}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
