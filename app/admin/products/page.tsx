'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

interface Category {
  id: string
  section: string
  name: string
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

// Predefined product types per section — these are what the forms expect
const SECTION_PRODUCT_TYPES: Record<string, { name: string; levels: number; levelLabels: [string, string, string] }[]> = {
  roof: [
    { name: 'Shingles', levels: 3, levelLabels: ['Brand', 'Line', 'Color'] },
    { name: 'Ventilation', levels: 1, levelLabels: ['Type', '', ''] },
    { name: 'Pipe Boots', levels: 1, levelLabels: ['Type', '', ''] },
    { name: 'Drip Edge', levels: 1, levelLabels: ['Type', '', ''] },
    { name: 'Ice & Water', levels: 1, levelLabels: ['Type', '', ''] },
    { name: 'Skylights', levels: 2, levelLabels: ['Brand', 'Model', ''] },
  ],
  siding: [
    { name: 'Siding', levels: 3, levelLabels: ['Brand', 'Line', 'Color'] },
    { name: 'Fascia', levels: 3, levelLabels: ['Brand', 'Color', 'Size'] },
    { name: 'Soffit', levels: 3, levelLabels: ['Brand', 'Color', 'Type'] },
  ],
  guttering: [],
  windows: [],
  small_jobs: [],
}

const SECTIONS = [
  { key: 'roof', label: 'Roof' },
  { key: 'siding', label: 'Siding' },
  { key: 'guttering', label: 'Guttering' },
  { key: 'windows', label: 'Windows' },
  { key: 'small_jobs', label: 'Small Jobs' },
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
  const [showNewOption, setShowNewOption] = useState(false)

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/products/categories')
    const data = await res.json()
    setCategories(data)
    return data as Category[]
  }, [])

  // On load: fetch categories and auto-create any missing predefined ones
  useEffect(() => {
    async function init() {
      const cats = await fetchCategories()
      await ensureCategories(cats)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function ensureCategories(existingCats: Category[]) {
    let created = false
    for (const [section, types] of Object.entries(SECTION_PRODUCT_TYPES)) {
      for (let i = 0; i < types.length; i++) {
        const type = types[i]
        const exists = existingCats.some(
          c => c.section === section && c.name.toLowerCase() === type.name.toLowerCase()
        )
        if (!exists) {
          await fetch('/api/products/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, name: type.name, sort_order: i }),
          })
          created = true
        }
      }
    }
    if (created) {
      await fetchCategories()
    }
  }

  async function fetchOptions(categoryId: string) {
    setOptionsLoading(true)
    const res = await fetch(`/api/products/options?category_id=${categoryId}&all=true`)
    const data = await res.json()
    setOptions(data)
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
      }),
    })
    if (res.ok) {
      toast.success('Option added')
      setNewOptionName('')
      setShowNewOption(false)
      fetchOptions(selectedCategory.id)
    } else {
      toast.error('Failed to add option')
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

  function selectCategory(cat: Category) {
    setSelectedCategory(cat)
    fetchOptions(cat.id)
    setShowNewOption(false)
  }

  // Get product types for current section
  const productTypes = SECTION_PRODUCT_TYPES[activeSection] || []

  // Filter categories for current section
  const sectionCategories = categories.filter(c => c.section === activeSection)

  // Match predefined types to existing categories
  const productTypeItems = productTypes.map(pt => {
    const cat = sectionCategories.find(c => c.name.toLowerCase() === pt.name.toLowerCase())
    return { ...pt, category: cat }
  }).filter(pt => {
    if (!pt.category) return false
    if (filterMode === 'active') return pt.category.active
    if (filterMode === 'inactive') return !pt.category.active
    return true
  })

  // Get the level labels for the selected category
  const selectedType = productTypes.find(
    pt => selectedCategory && pt.name.toLowerCase() === selectedCategory.name.toLowerCase()
  )
  const levelLabels = selectedType?.levelLabels || ['Brand / Type', 'Line / Model', 'Color / Variant']
  const maxLevels = selectedType?.levels || 3

  // Filter options by active status
  const filteredOptions = options.filter(o => {
    if (filterMode === 'active') return o.active
    if (filterMode === 'inactive') return !o.active
    return true
  })

  // Build tree from filtered options
  const rootOptions = filteredOptions.filter(o => !o.parent_id)
  const getChildren = (parentId: string) => filteredOptions.filter(o => o.parent_id === parentId)

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>

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
          ) : productTypes.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">
                {activeSection === 'guttering' ? 'Guttering' : activeSection === 'windows' ? 'Windows' : 'Small Jobs'} uses free-form entries on the production plan.
              </p>
              <p className="text-sm text-gray-400 mt-1">No product catalog needed for this section.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Product types column */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">Product Types</h2>
                {productTypeItems.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    {filterMode === 'inactive' ? 'No inactive product types' : 'Loading...'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {productTypeItems.map(pt => (
                      <div
                        key={pt.name}
                        className={`flex items-center gap-2 rounded-lg transition-colors ${
                          selectedCategory?.id === pt.category?.id
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-50'
                        } ${pt.category && !pt.category.active ? 'opacity-50' : ''}`}
                      >
                        <button
                          onClick={() => pt.category && selectCategory(pt.category)}
                          className={`flex-1 text-left px-3 py-2.5 text-sm ${
                            selectedCategory?.id === pt.category?.id
                              ? 'text-primary font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {pt.name}
                        </button>
                        {pt.category && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCategoryActive(pt.category!) }}
                            className={`text-xs px-2 py-0.5 rounded mr-2 shrink-0 ${
                              pt.category.active
                                ? 'text-green-700 bg-green-50 hover:bg-green-100'
                                : 'text-red-700 bg-red-50 hover:bg-red-100'
                            }`}
                          >
                            {pt.category.active ? 'Active' : 'Inactive'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options tree (2 columns wide) */}
              <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
                {!selectedCategory ? (
                  <p className="text-sm text-gray-400 py-8 text-center">Select a product type to manage options</p>
                ) : optionsLoading ? (
                  <Loading message="Loading options..." />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-900">{selectedCategory.name}</h2>
                      <button
                        onClick={() => {
                          setShowNewOption(true)
                          setNewOptionParentId(null)
                          setNewOptionLevel(0)
                        }}
                        className="text-primary hover:text-primary-dark text-sm font-medium"
                      >
                        + Add {levelLabels[0]}
                      </button>
                    </div>

                    {showNewOption && (
                      <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          value={newOptionName}
                          onChange={e => setNewOptionName(e.target.value)}
                          placeholder={`${levelLabels[newOptionLevel]} name`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          onKeyDown={e => e.key === 'Enter' && createOption()}
                          autoFocus
                        />
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
                          : `No options yet. Add a ${levelLabels[0]} to get started.`
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
                            onAddChild={(parentId, level) => {
                              setNewOptionParentId(parentId)
                              setNewOptionLevel(level)
                              setShowNewOption(true)
                              setNewOptionName('')
                            }}
                            levelLabels={levelLabels}
                            maxLevels={maxLevels}
                          />
                        ))}
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

function OptionNode({
  option,
  getChildren,
  onToggleActive,
  onAddChild,
  levelLabels,
  maxLevels,
  depth = 0,
}: {
  option: Option
  getChildren: (parentId: string) => Option[]
  onToggleActive: (opt: Option) => void
  onAddChild: (parentId: string, level: number) => void
  levelLabels: [string, string, string]
  maxLevels: number
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const children = getChildren(option.id)
  const nextLevel = option.level + 1
  const canHaveChildren = nextLevel < maxLevels

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-3' : ''}>
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg group hover:bg-gray-50 ${!option.active ? 'opacity-50' : ''}`}>
        {children.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4" />
        )}

        <span className={`flex-1 text-sm ${depth === 0 ? 'font-medium' : ''}`}>
          {option.name}
        </span>

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
      </div>

      {expanded && children.length > 0 && (
        <div className="space-y-0.5">
          {children.map(child => (
            <OptionNode
              key={child.id}
              option={child}
              getChildren={getChildren}
              onToggleActive={onToggleActive}
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
