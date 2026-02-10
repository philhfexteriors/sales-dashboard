'use client'

import { useEffect, useState } from 'react'
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

const SECTIONS = [
  { key: 'roof', label: 'Roof' },
  { key: 'siding', label: 'Siding' },
  { key: 'guttering', label: 'Guttering' },
  { key: 'windows', label: 'Windows' },
  { key: 'small_jobs', label: 'Small Jobs' },
]

const LEVEL_LABELS = ['Brand / Type', 'Line / Model', 'Color / Variant']

export default function ProductsAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('roof')

  // New category form
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)

  // New option form
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionParentId, setNewOptionParentId] = useState<string | null>(null)
  const [newOptionLevel, setNewOptionLevel] = useState(0)
  const [showNewOption, setShowNewOption] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    const res = await fetch('/api/products/categories')
    const data = await res.json()
    setCategories(data)
    setLoading(false)
  }

  async function fetchOptions(categoryId: string) {
    setOptionsLoading(true)
    const res = await fetch(`/api/products/options?category_id=${categoryId}`)
    const data = await res.json()
    setOptions(data)
    setOptionsLoading(false)
  }

  async function createCategory() {
    if (!newCatName.trim()) return
    const res = await fetch('/api/products/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: activeSection, name: newCatName.trim() }),
    })
    if (res.ok) {
      toast.success('Category created')
      setNewCatName('')
      setShowNewCat(false)
      fetchCategories()
    } else {
      toast.error('Failed to create category')
    }
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

  async function toggleOptionActive(option: Option) {
    const res = await fetch(`/api/products/options/${option.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !option.active }),
    })
    if (res.ok) {
      toast.success(option.active ? 'Disabled' : 'Enabled')
      if (selectedCategory) fetchOptions(selectedCategory.id)
    }
  }

  function selectCategory(cat: Category) {
    setSelectedCategory(cat)
    fetchOptions(cat.id)
    setShowNewOption(false)
  }

  const sectionCategories = categories.filter(c => c.section === activeSection)

  // Build tree from flat options
  const rootOptions = options.filter(o => !o.parent_id)
  const getChildren = (parentId: string) => options.filter(o => o.parent_id === parentId)

  return (
    <AppShell>
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <div className="p-6 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Catalog</h1>

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
              {/* Categories column */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Categories</h2>
                  <button
                    onClick={() => setShowNewCat(!showNewCat)}
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                  >
                    + Add
                  </button>
                </div>

                {showNewCat && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onKeyDown={e => e.key === 'Enter' && createCategory()}
                    />
                    <button
                      onClick={createCategory}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                    >
                      Add
                    </button>
                  </div>
                )}

                {sectionCategories.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No categories yet</p>
                ) : (
                  <div className="space-y-1">
                    {sectionCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => selectCategory(cat)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          selectedCategory?.id === cat.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Options tree (2 columns wide) */}
              <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
                {!selectedCategory ? (
                  <p className="text-sm text-gray-400 py-8 text-center">Select a category to manage options</p>
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
                        + Add {LEVEL_LABELS[0]}
                      </button>
                    </div>

                    {showNewOption && (
                      <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          value={newOptionName}
                          onChange={e => setNewOptionName(e.target.value)}
                          placeholder={`${LEVEL_LABELS[newOptionLevel]} name`}
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
                      <p className="text-sm text-gray-400 py-8 text-center">No options yet. Add a {LEVEL_LABELS[0]} to get started.</p>
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
  depth = 0,
}: {
  option: Option
  getChildren: (parentId: string) => Option[]
  onToggleActive: (opt: Option) => void
  onAddChild: (parentId: string, level: number) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const children = getChildren(option.id)
  const nextLevel = option.level + 1
  const canHaveChildren = nextLevel <= 2

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
          {LEVEL_LABELS[option.level]}
        </span>

        {canHaveChildren && (
          <button
            onClick={() => onAddChild(option.id, nextLevel)}
            className="text-xs text-primary hover:text-primary-dark opacity-0 group-hover:opacity-100 transition-opacity"
          >
            + {LEVEL_LABELS[nextLevel]}
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
          {option.active ? 'Active' : 'Disabled'}
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
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
