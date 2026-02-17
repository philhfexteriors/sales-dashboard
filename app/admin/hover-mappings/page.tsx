'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import AppShell from '@/components/AppShell'
import RoleGuard from '@/components/RoleGuard'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import type { MappingConfig } from '@/lib/services/measurementMapper'
import { AVAILABLE_COMPUTATIONS } from '@/lib/services/measurementMapper'

// ---------- Constants ----------

const TRADE_LABELS: Record<string, string> = {
  roof: 'Roof',
  siding: 'Siding',
  gutters: 'Gutters',
  fascia_soffit: 'Fascia / Soffit',
}

const SOURCE_LABELS: Record<string, string> = {
  roof: 'Roof',
  area: 'Area Summary',
  openings: 'Openings',
  trim: 'Trim',
  roofline: 'Roofline / Soffit',
  corners: 'Corners',
  facades: 'Facades (old format)',
}

const TYPE_COLORS: Record<string, { dot: string; line: string; label: string }> = {
  direct: { dot: 'bg-green-500', line: '#22c55e', label: 'Direct' },
  computed: { dot: 'bg-blue-500', line: '#3b82f6', label: 'Computed' },
  derived: { dot: 'bg-orange-500', line: '#f97316', label: 'Derived' },
  manual: { dot: 'bg-gray-400', line: '#9ca3af', label: 'Manual' },
}

const TYPE_DASH: Record<string, string> = {
  direct: '',
  computed: '8 4',
  derived: '4 4',
  manual: '',
}

// ---------- Types ----------

interface LineData {
  x1: number
  y1: number
  x2: number
  y2: number
  type: string
}

// ---------- Main Page ----------

export default function HoverMappingsPage() {
  const [mappings, setMappings] = useState<MappingConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [lines, setLines] = useState<LineData[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const sourceRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const targetRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // ---------- Data Fetching ----------

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch('/api/hover-mappings')
      if (res.ok) {
        const data = await res.json()
        setMappings(data)
      } else {
        toast.error('Failed to load mappings')
      }
    } catch {
      toast.error('Failed to load mappings')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMappings() }, [fetchMappings])

  // ---------- SVG Line Calculation ----------

  const calculateLines = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const newLines: LineData[] = []

    for (const mapping of mappings) {
      if (mapping.mapping_type === 'manual') continue

      const sourceKey = mapping.hover_source_category
      if (sourceKey === 'none') continue

      const sourceEl = sourceRefs.current.get(sourceKey)
      const targetEl = targetRefs.current.get(mapping.target_field)

      if (sourceEl && targetEl) {
        const sourceRect = sourceEl.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()

        newLines.push({
          x1: sourceRect.right - containerRect.left,
          y1: sourceRect.top + sourceRect.height / 2 - containerRect.top,
          x2: targetRect.left - containerRect.left,
          y2: targetRect.top + targetRect.height / 2 - containerRect.top,
          type: mapping.mapping_type,
        })
      }
    }
    setLines(newLines)
  }, [mappings])

  useEffect(() => {
    // Recalculate after render and on resize
    const timer = setTimeout(calculateLines, 100)
    const observer = new ResizeObserver(() => calculateLines())
    if (containerRef.current) observer.observe(containerRef.current)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [calculateLines, editingField])

  // ---------- Actions ----------

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/hover-mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })
      if (res.ok) {
        const data = await res.json()
        setMappings(data)
        setDirty(false)
        toast.success('Mappings saved')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  const handleReset = async () => {
    if (!confirm('Reset all mappings to defaults? This cannot be undone.')) return
    setSaving(true)
    try {
      const res = await fetch('/api/hover-mappings/reset', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setMappings(data)
        setDirty(false)
        setEditingField(null)
        toast.success('Mappings reset to defaults')
      } else {
        toast.error('Failed to reset')
      }
    } catch {
      toast.error('Failed to reset')
    }
    setSaving(false)
  }

  const updateMapping = (targetField: string, updates: Partial<MappingConfig>) => {
    setMappings(prev => prev.map(m =>
      m.target_field === targetField ? { ...m, ...updates } : m
    ))
    setDirty(true)
  }

  // ---------- Grouping ----------

  const sourceCategories = ['roof', 'area', 'openings', 'trim', 'roofline', 'corners', 'facades'] as const
  const tradeGroups = Object.keys(TRADE_LABELS)

  const mappingsByTrade = tradeGroups.reduce((acc, trade) => {
    acc[trade] = mappings.filter(m => m.trade_group === trade)
    return acc
  }, {} as Record<string, MappingConfig[]>)

  // Which source categories are actively used?
  const activeSourceCategories = new Set(
    mappings.filter(m => m.mapping_type !== 'manual' && m.hover_source_category !== 'none')
      .map(m => m.hover_source_category)
  )

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin', 'sales_manager']}>
        <AppShell><Loading /></AppShell>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'sales_manager']}>
      <AppShell>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hover Measurement Mappings</h1>
              <p className="text-sm text-gray-500 mt-1">
                Configure how Hover measurement data maps to internal bid calculation fields
              </p>
            </div>
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-8 h-0.5 bg-green-500 inline-block" />
              Direct (JSON path)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-8 h-0.5 bg-blue-500 inline-block" style={{ borderTop: '2px dashed #3b82f6', height: 0 }} />
              Computed (built-in calc)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-8 h-0.5 bg-orange-500 inline-block" style={{ borderTop: '2px dotted #f97316', height: 0 }} />
              Derived (formula)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
              Manual (no Hover source)
            </span>
          </div>

          {/* Three-column layout */}
          <div ref={containerRef} className="relative flex gap-0">
            {/* Left: Hover Sources */}
            <div className="w-[280px] flex-shrink-0 space-y-4 pr-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Hover Sources
              </h2>
              {sourceCategories.map(cat => (
                <div
                  key={cat}
                  ref={el => { if (el) sourceRefs.current.set(cat, el) }}
                  className={`p-3 rounded-lg border transition-colors ${
                    activeSourceCategories.has(cat)
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${
                      activeSourceCategories.has(cat) ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-semibold text-gray-800">
                      {SOURCE_LABELS[cat]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {cat === 'roof' && (
                      <>
                        <SourcePath path="roof.roof_facets.area" />
                        <SourcePath path="roof.ridges_hips.length" />
                        <SourcePath path="roof.valleys.length" />
                        <SourcePath path="roof.rakes.length" />
                        <SourcePath path="roof.gutters_eaves.length" />
                        <SourcePath path="roof.flashing.length" />
                        <SourcePath path="roof.step_flashing.length" />
                        <SourcePath path="roof.pitch[*]" label="roof.pitch (pitch/area %)" />
                        <SourcePath path="roof.waste_factor.area.*" label="roof.waste_factor.area" />
                      </>
                    )}
                    {cat === 'area' && (
                      <>
                        <SourcePath path="area.facades.siding" />
                        <SourcePath path="area.facades.other" />
                        <SourcePath path="area.openings.siding" />
                        <SourcePath path="area.total.siding" />
                        <SourcePath path="siding_waste.*" label="siding_waste (precomputed)" />
                      </>
                    )}
                    {cat === 'openings' && (
                      <>
                        <SourcePath path="openings.quantity.siding" />
                        <SourcePath path="openings.tops_length.siding" />
                        <SourcePath path="openings.sills_length.siding" />
                        <SourcePath path="openings.sides_length.siding" />
                        <SourcePath path="openings.total_perimeter.siding" />
                      </>
                    )}
                    {cat === 'trim' && (
                      <>
                        <SourcePath path="trim.level_starter.siding" />
                        <SourcePath path="trim.sloped_trim.siding" />
                        <SourcePath path="trim.vertical_trim.siding" />
                        <SourcePath path="transitions.level_transitions.siding" label="transitions.level_transitions" />
                        <SourcePath path="transitions.sloped_transitions.siding" label="transitions.sloped_transitions" />
                      </>
                    )}
                    {cat === 'roofline' && (
                      <>
                        <SourcePath path="roofline.eaves_fascia.length" />
                        <SourcePath path="roofline.rakes_fascia.length" />
                        <SourcePath path="roofline.level_frieze_board.length" />
                        <SourcePath path="roofline.level_frieze_board.soffit_area" />
                        <SourcePath path="roofline.sloped_frieze_board.length" />
                        <SourcePath path="roofline.sloped_frieze_board.soffit_area" />
                      </>
                    )}
                    {cat === 'corners' && (
                      <>
                        <SourcePath path="corners.outside_corners_qty.siding" />
                        <SourcePath path="corners.outside_corners_len.siding" />
                        <SourcePath path="corners.inside_corners_qty.siding" />
                        <SourcePath path="corners.inside_corners_len.siding" />
                      </>
                    )}
                    {cat === 'facades' && (
                      <>
                        <SourcePath path="facades[*].area" label="facades[*].area (old format)" />
                        <SourcePath path="accessories.shutter_qty.siding" />
                        <SourcePath path="accessories.vents_qty.siding" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Center: SVG Lines */}
            <div className="w-[120px] flex-shrink-0 relative">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible' }}
              >
                {lines.map((line, i) => {
                  // Adjust coordinates relative to the SVG's position within container
                  const svgLeft = 280 // width of left panel
                  const x1 = line.x1 - svgLeft
                  const x2 = line.x2 - svgLeft
                  const mx = (x1 + x2) / 2

                  return (
                    <path
                      key={i}
                      d={`M ${x1} ${line.y1} C ${mx} ${line.y1}, ${mx} ${line.y2}, ${x2} ${line.y2}`}
                      stroke={TYPE_COLORS[line.type]?.line || '#9ca3af'}
                      strokeWidth={1.5}
                      strokeDasharray={TYPE_DASH[line.type] || ''}
                      fill="none"
                      opacity={0.7}
                    />
                  )
                })}
              </svg>
            </div>

            {/* Right: Internal Fields */}
            <div className="flex-1 space-y-6 pl-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Internal Measurement Fields
              </h2>
              {tradeGroups.map(trade => {
                const items = mappingsByTrade[trade]
                if (!items?.length) return null
                return (
                  <div key={trade}>
                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <TradeIcon trade={trade} />
                      {TRADE_LABELS[trade]}
                    </h3>
                    <div className="space-y-1">
                      {items.map(mapping => (
                        <div key={mapping.target_field}>
                          <div
                            ref={el => { if (el) targetRefs.current.set(mapping.target_field, el) }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              editingField === mapping.target_field
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => setEditingField(
                              editingField === mapping.target_field ? null : mapping.target_field
                            )}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TYPE_COLORS[mapping.mapping_type]?.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {mapping.target_label}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {mapping.target_unit}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 truncate">
                                {mapping.mapping_type === 'direct' && mapping.hover_json_paths && (
                                  <span className="font-mono">{mapping.hover_json_paths.split('|')[0]}</span>
                                )}
                                {mapping.mapping_type === 'computed' && (
                                  <span>{mapping.hover_source_description}</span>
                                )}
                                {mapping.mapping_type === 'derived' && (
                                  <span className="font-mono">{mapping.derived_formula}</span>
                                )}
                                {mapping.mapping_type === 'manual' && (
                                  <span className="italic">Manual entry</span>
                                )}
                              </p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              mapping.mapping_type === 'direct' ? 'bg-green-100 text-green-700' :
                              mapping.mapping_type === 'computed' ? 'bg-blue-100 text-blue-700' :
                              mapping.mapping_type === 'derived' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {TYPE_COLORS[mapping.mapping_type]?.label}
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${editingField === mapping.target_field ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          {/* Inline Editor */}
                          {editingField === mapping.target_field && (
                            <MappingEditor
                              mapping={mapping}
                              allMappings={mappings}
                              onUpdate={(updates) => updateMapping(mapping.target_field, updates)}
                              onClose={() => setEditingField(null)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save Bar */}
          {dirty && (
            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-amber-50 border-t border-amber-200 p-4 flex items-center justify-between z-40">
              <span className="text-sm text-amber-800 font-medium">You have unsaved changes</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { fetchMappings(); setDirty(false); setEditingField(null) }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RoleGuard>
  )
}

// ---------- Sub-Components ----------

function SourcePath({ path, label }: { path: string; label?: string }) {
  return (
    <p className="text-[11px] font-mono text-gray-500 truncate" title={path}>
      {label || path}
    </p>
  )
}

function MappingEditor({
  mapping,
  allMappings,
  onUpdate,
  onClose,
}: {
  mapping: MappingConfig
  allMappings: MappingConfig[]
  onUpdate: (updates: Partial<MappingConfig>) => void
  onClose: () => void
}) {
  const types: MappingConfig['mapping_type'][] = ['direct', 'computed', 'derived', 'manual']
  const otherFields = allMappings
    .filter(m => m.target_field !== mapping.target_field && m.mapping_type !== 'derived')
    .map(m => m.target_field)

  const handleTypeChange = (type: MappingConfig['mapping_type']) => {
    const updates: Partial<MappingConfig> = { mapping_type: type }
    if (type === 'direct') {
      updates.hover_source_category = mapping.trade_group === 'roof' ? 'roof' : 'facades'
      updates.hover_json_paths = updates.hover_json_paths || ''
      updates.computation_id = null
      updates.derived_formula = null
    } else if (type === 'computed') {
      updates.hover_source_category = 'facades'
      updates.computation_id = mapping.computation_id || AVAILABLE_COMPUTATIONS[0]?.id || ''
      updates.hover_json_paths = null
      updates.derived_formula = null
    } else if (type === 'derived') {
      updates.hover_source_category = 'openings'
      updates.derived_formula = mapping.derived_formula || ''
      updates.hover_json_paths = null
      updates.computation_id = null
    } else {
      updates.hover_source_category = 'none'
      updates.hover_json_paths = null
      updates.computation_id = null
      updates.derived_formula = null
    }
    onUpdate(updates)
  }

  return (
    <div className="mt-1 ml-5 p-4 rounded-lg border border-gray-200 bg-white space-y-4">
      {/* Type Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Mapping Type</label>
        <div className="flex gap-1">
          {types.map(type => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                mapping.mapping_type === type
                  ? type === 'direct' ? 'bg-green-100 text-green-700 ring-1 ring-green-300' :
                    type === 'computed' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' :
                    type === 'derived' ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300' :
                    'bg-gray-200 text-gray-700 ring-1 ring-gray-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {TYPE_COLORS[type]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific inputs */}
      {mapping.mapping_type === 'direct' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            JSON Paths <span className="font-normal text-gray-400">(pipe-separated fallbacks)</span>
          </label>
          <input
            type="text"
            value={mapping.hover_json_paths || ''}
            onChange={e => onUpdate({ hover_json_paths: e.target.value })}
            placeholder="e.g., roof.measurements.ridges|roof.ridges"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="mt-2">
            <p className="text-[10px] text-gray-400 mb-1">Common paths:</p>
            <div className="flex flex-wrap gap-1">
              {getCommonPaths(mapping.trade_group).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    const current = mapping.hover_json_paths || ''
                    const paths = current ? current.split('|').map(s => s.trim()) : []
                    if (!paths.includes(p)) {
                      onUpdate({ hover_json_paths: [...paths, p].join('|') })
                    }
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 font-mono"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Source category */}
          <label className="block text-xs font-medium text-gray-500 mt-3 mb-1.5">
            Source Category <span className="font-normal text-gray-400">(for connection lines)</span>
          </label>
          <select
            value={mapping.hover_source_category}
            onChange={e => onUpdate({ hover_source_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="roof">Roof</option>
            <option value="area">Area Summary</option>
            <option value="openings">Openings</option>
            <option value="trim">Trim</option>
            <option value="roofline">Roofline / Soffit</option>
            <option value="corners">Corners</option>
            <option value="facades">Facades (old format)</option>
            <option value="none">None</option>
          </select>
        </div>
      )}

      {mapping.mapping_type === 'computed' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Computation</label>
          <select
            value={mapping.computation_id || ''}
            onChange={e => onUpdate({ computation_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select computation...</option>
            {AVAILABLE_COMPUTATIONS.map(comp => (
              <option key={comp.id} value={comp.id}>{comp.label}</option>
            ))}
          </select>
          {mapping.computation_id && (
            <p className="text-[11px] text-gray-400 mt-1">
              {AVAILABLE_COMPUTATIONS.find(c => c.id === mapping.computation_id)?.description}
            </p>
          )}

          <label className="block text-xs font-medium text-gray-500 mt-3 mb-1.5">Source Category</label>
          <select
            value={mapping.hover_source_category}
            onChange={e => onUpdate({ hover_source_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="roof">Roof</option>
            <option value="area">Area Summary</option>
            <option value="openings">Openings</option>
            <option value="trim">Trim</option>
            <option value="roofline">Roofline / Soffit</option>
            <option value="corners">Corners</option>
            <option value="facades">Facades (old format)</option>
            <option value="none">None</option>
          </select>
        </div>
      )}

      {mapping.mapping_type === 'derived' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Formula <span className="font-normal text-gray-400">(use {'{fieldName}'} tokens)</span>
          </label>
          <input
            type="text"
            value={mapping.derived_formula || ''}
            onChange={e => onUpdate({ derived_formula: e.target.value })}
            placeholder="e.g., {openingsPerimeter} / 4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="mt-2">
            <p className="text-[10px] text-gray-400 mb-1">Available fields:</p>
            <div className="flex flex-wrap gap-1">
              {otherFields.map(f => (
                <button
                  key={f}
                  onClick={() => {
                    const current = mapping.derived_formula || ''
                    onUpdate({ derived_formula: current + `{${f}}` })
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 font-mono"
                >
                  {`{${f}}`}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-500 mt-3 mb-1.5">Source Category</label>
          <select
            value={mapping.hover_source_category}
            onChange={e => onUpdate({ hover_source_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="roof">Roof</option>
            <option value="area">Area Summary</option>
            <option value="openings">Openings</option>
            <option value="trim">Trim</option>
            <option value="roofline">Roofline / Soffit</option>
            <option value="corners">Corners</option>
            <option value="facades">Facades (old format)</option>
            <option value="none">None</option>
          </select>
        </div>
      )}

      {/* Default Value (shown for all types) */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Default Value <span className="font-normal text-gray-400">(when Hover data is missing)</span>
        </label>
        <input
          type="number"
          value={mapping.default_value}
          onChange={e => onUpdate({ default_value: parseFloat(e.target.value) || 0 })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
        <input
          type="text"
          value={mapping.hover_source_description || ''}
          onChange={e => onUpdate({ hover_source_description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Close */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function TradeIcon({ trade }: { trade: string }) {
  if (trade === 'roof') return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21l9-9 9 9M3 21h18" />
    </svg>
  )
  if (trade === 'siding') return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
  if (trade === 'gutters') return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )
  return (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
    </svg>
  )
}

function getCommonPaths(tradeGroup: string): string[] {
  const paths: Record<string, string[]> = {
    roof: [
      'roof.roof_facets.area',
      'roof.ridges_hips.length',
      'roof.valleys.length',
      'roof.rakes.length',
      'roof.gutters_eaves.length',
      'roof.flashing.length',
      'roof.step_flashing.length',
      'roofline.eaves_fascia.length',
      'roofline.rakes_fascia.length',
    ],
    siding: [
      'area.facades.siding',
      'area.total.siding',
      'corners.outside_corners_qty.siding',
      'corners.inside_corners_qty.siding',
      'corners.outside_corners_len.siding',
      'corners.inside_corners_len.siding',
      'openings.total_perimeter.siding',
      'openings.tops_length.siding',
      'openings.sills_length.siding',
      'openings.sides_length.siding',
      'openings.quantity.siding',
      'trim.level_starter.siding',
      'trim.sloped_trim.siding',
      'trim.vertical_trim.siding',
      'roofline.level_frieze_board.length',
      'roofline.sloped_frieze_board.length',
      'roofline.level_frieze_board.soffit_area',
      'roofline.sloped_frieze_board.soffit_area',
      'transitions.level_transitions.siding',
    ],
    gutters: [
      'roof.gutters_eaves.length',
      'roofline.eaves_fascia.length',
    ],
    fascia_soffit: [
      'roofline.eaves_fascia.length',
      'roofline.rakes_fascia.length',
      'roofline.level_frieze_board.soffit_area',
      'roofline.sloped_frieze_board.soffit_area',
    ],
  }
  return paths[tradeGroup] || []
}
