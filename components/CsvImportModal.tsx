'use client'

import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

interface Category {
  id: string
  trade: string
  name: string
  active: boolean
}

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  activeTrade: string
  categories: Category[]
  onComplete: () => void
}

type TargetField = 'description' | 'category' | 'brand' | 'section' | 'trade' | 'unit' | 'unit_price' | 'is_taxable' | 'notes' | '_skip'

interface ColumnMapping {
  csvHeader: string
  target: TargetField
}

interface ParsedRow {
  [key: string]: string
}

interface PreviewRow {
  description: string
  category: string
  brand: string
  section: string
  trade: string
  unit: string
  unit_price: number
  is_taxable: boolean
  notes: string
  warnings: string[]
}

const TARGET_FIELDS: { key: TargetField; label: string; required?: boolean }[] = [
  { key: '_skip', label: '— Skip —' },
  { key: 'description', label: 'Item / Line (required)', required: true },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'section', label: 'Section (Material/Labor)' },
  { key: 'trade', label: 'Trade' },
  { key: 'unit', label: 'Unit' },
  { key: 'unit_price', label: 'Price' },
  { key: 'is_taxable', label: 'Taxable' },
  { key: 'notes', label: 'Notes' },
]

const VALID_UNITS = ['EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR']

const TRADE_MAP: Record<string, string> = {
  'roofing': 'roof', 'roof': 'roof',
  'siding': 'siding',
  'gutters': 'gutters', 'gutter': 'gutters',
  'windows': 'windows', 'window': 'windows',
  'fascia & soffit': 'fascia_soffit', 'fascia_soffit': 'fascia_soffit', 'fascia soffit': 'fascia_soffit', 'fascia': 'fascia_soffit',
  'general': 'general',
}

const TRADE_LABELS: Record<string, string> = {
  'roof': 'Roofing', 'siding': 'Siding', 'gutters': 'Gutters',
  'windows': 'Windows', 'fascia_soffit': 'Fascia & Soffit', 'general': 'General',
}

// Auto-match CSV headers to target fields
function autoMatch(header: string): TargetField {
  const h = header.toLowerCase().trim()
  if (['item', 'description', 'name', 'line', 'product'].includes(h)) return 'description'
  if (['category', 'cat', 'group'].includes(h)) return 'category'
  if (['brand', 'manufacturer', 'mfg'].includes(h)) return 'brand'
  if (['class', 'section', 'type'].includes(h)) return 'section'
  if (['trade'].includes(h)) return 'trade'
  if (['unit', 'uom', 'unit of measure'].includes(h)) return 'unit'
  if (['price', 'unit price', 'unit_price', 'cost', 'rate'].includes(h)) return 'unit_price'
  if (['tax', 'taxable', 'is_taxable'].includes(h)) return 'is_taxable'
  if (['notes', 'note', 'comments', 'comment'].includes(h)) return 'notes'
  return '_skip'
}

// Simple CSV parser handling quoted fields with commas and escaped quotes
function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field.trim())
        field = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++
        current.push(field.trim())
        if (current.some(c => c !== '')) lines.push(current)
        current = []
        field = ''
      } else {
        field += ch
      }
    }
  }
  // Last field
  current.push(field.trim())
  if (current.some(c => c !== '')) lines.push(current)

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0]
  const rows = lines.slice(1).map(line => {
    const row: ParsedRow = {}
    headers.forEach((h, i) => {
      row[h] = line[i] || ''
    })
    return row
  })

  return { headers, rows }
}

export default function CsvImportModal({ open, onClose, activeTrade, categories, onComplete }: CsvImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<ParsedRow[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep(1)
    setCsvHeaders([])
    setCsvRows([])
    setMappings([])
    setPreviewRows([])
    setImporting(false)
    setImportProgress({ done: 0, total: 0 })
  }, [])

  function handleClose() {
    reset()
    onClose()
  }

  // Step 1: File upload
  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) {
        toast.error('Could not read file')
        return
      }
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0 || rows.length === 0) {
        toast.error('No data found in CSV')
        return
      }
      setCsvHeaders(headers)
      setCsvRows(rows)
      // Auto-match columns
      const autoMappings = headers.map(h => ({ csvHeader: h, target: autoMatch(h) }))
      setMappings(autoMappings)
      setStep(2)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file)
    } else {
      toast.error('Please drop a CSV file')
    }
  }

  // Step 2: Validate mappings
  function hasDescriptionMapping() {
    return mappings.some(m => m.target === 'description')
  }

  function updateMapping(index: number, target: TargetField) {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, target } : m))
  }

  // Step 2 → 3: Build preview
  function buildPreview() {
    if (!hasDescriptionMapping()) {
      toast.error('You must map at least one column to "Item / Line"')
      return
    }

    const descCol = mappings.find(m => m.target === 'description')?.csvHeader
    const catCol = mappings.find(m => m.target === 'category')?.csvHeader
    const brandCol = mappings.find(m => m.target === 'brand')?.csvHeader
    const sectionCol = mappings.find(m => m.target === 'section')?.csvHeader
    const tradeCol = mappings.find(m => m.target === 'trade')?.csvHeader
    const unitCol = mappings.find(m => m.target === 'unit')?.csvHeader
    const priceCol = mappings.find(m => m.target === 'unit_price')?.csvHeader
    const taxCol = mappings.find(m => m.target === 'is_taxable')?.csvHeader
    const notesCol = mappings.find(m => m.target === 'notes')?.csvHeader

    const rows: PreviewRow[] = csvRows.map(row => {
      const warnings: string[] = []
      const description = descCol ? row[descCol] : ''
      const category = catCol ? row[catCol] : ''
      const brand = brandCol ? row[brandCol] : ''

      // Section normalization
      let section = 'materials'
      if (sectionCol && row[sectionCol]) {
        const s = row[sectionCol].toLowerCase().trim()
        if (s === 'labor' || s === 'labour') section = 'labor'
        else section = 'materials'
      }

      // Trade normalization
      let trade = activeTrade
      if (tradeCol && row[tradeCol]) {
        const t = row[tradeCol].toLowerCase().trim()
        const mapped = TRADE_MAP[t]
        if (mapped) {
          trade = mapped
        } else {
          warnings.push(`Unknown trade "${row[tradeCol]}"`)
          trade = activeTrade
        }
      }

      // Unit normalization
      let unit = 'EA'
      if (unitCol && row[unitCol]) {
        const u = row[unitCol].toUpperCase().trim()
        if (VALID_UNITS.includes(u)) {
          unit = u
        } else {
          warnings.push(`Unknown unit "${row[unitCol]}"`)
          unit = 'EA'
        }
      }

      // Price
      let unit_price = 0
      if (priceCol && row[priceCol]) {
        const p = parseFloat(row[priceCol].replace(/[$,]/g, ''))
        if (!isNaN(p)) unit_price = p
      }

      // Taxable
      let is_taxable = false
      if (taxCol && row[taxCol]) {
        const v = row[taxCol].toLowerCase().trim()
        is_taxable = ['yes', 'y', '1', 'true'].includes(v)
      }

      const notes = notesCol ? row[notesCol] : ''

      if (!description) warnings.push('Missing item name')

      return { description, category, brand, section, trade, unit, unit_price, is_taxable, notes, warnings }
    })

    setPreviewRows(rows)
    setStep(3)
  }

  // Step 3: Import
  async function doImport() {
    setImporting(true)
    const validRows = previewRows.filter(r => r.description)
    setImportProgress({ done: 0, total: validRows.length })

    try {
      // 1. Gather unique categories we need to create
      const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()))
      const uniqueNewCategories = new Set<string>()

      for (const row of validRows) {
        if (row.category && !existingCatNames.has(row.category.toLowerCase())) {
          uniqueNewCategories.add(row.category)
        }
      }

      // 2. Create missing categories
      const newCatMap: Record<string, string> = {} // name (lowercase) → id
      for (const catName of uniqueNewCategories) {
        const res = await fetch('/api/price-list/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trade: activeTrade,
            name: catName,
            sort_order: categories.length + Object.keys(newCatMap).length,
          }),
        })
        if (res.ok) {
          const cat = await res.json()
          newCatMap[catName.toLowerCase()] = cat.id
        }
      }

      // Build full category lookup: existing + newly created
      const catLookup: Record<string, string> = {} // name (lowercase) → id
      for (const c of categories) {
        catLookup[c.name.toLowerCase()] = c.id
      }
      Object.assign(catLookup, newCatMap)

      // 3. Create items
      let created = 0
      let errors = 0
      for (const row of validRows) {
        const categoryId = row.category ? catLookup[row.category.toLowerCase()] || null : null

        const res = await fetch('/api/price-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trade: row.trade,
            section: row.section,
            description: row.description,
            brand: row.brand || null,
            unit: row.unit,
            unit_price: row.unit_price,
            is_taxable: row.is_taxable,
            notes: row.notes || null,
            category_id: categoryId,
            sort_order: created,
          }),
        })

        if (res.ok) {
          created++
        } else {
          errors++
        }
        setImportProgress({ done: created + errors, total: validRows.length })
      }

      if (errors === 0) {
        toast.success(`Imported ${created} items successfully`)
      } else {
        toast.success(`Imported ${created} items (${errors} failed)`)
      }

      onComplete()
      handleClose()
    } catch {
      toast.error('Import failed')
      setImporting(false)
    }
  }

  if (!open) return null

  // Stats for preview
  const validCount = previewRows.filter(r => r.description).length
  const warningCount = previewRows.filter(r => r.warnings.length > 0).length
  const errorCount = previewRows.filter(r => !r.description).length
  const existingCatNames = new Set(categories.map(c => c.name.toLowerCase()))
  const newCategoryNames = [...new Set(previewRows.map(r => r.category).filter(c => c && !existingCatNames.has(c.toLowerCase())))]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of 3 — {step === 1 ? 'Upload File' : step === 2 ? 'Map Columns' : 'Preview & Import'}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s < step ? 'bg-green-500 text-white' : s === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                <span className={`text-xs font-medium ${s === step ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s === 1 ? 'Upload' : s === 2 ? 'Map Columns' : 'Preview'}
                </span>
                {s < 3 && <div className="w-8 h-px bg-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div>
              {/* Instructions */}
              <div className="mb-6 bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 text-sm mb-2">CSV Formatting Guide</h3>
                <div className="text-xs text-blue-800 space-y-2">
                  <p><strong>Required column:</strong> <code className="bg-blue-100 px-1 rounded">Item</code> — the product name/description</p>
                  <p><strong>Optional columns:</strong></p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><code className="bg-blue-100 px-1 rounded">Category</code> — groups items (auto-created if new)</li>
                    <li><code className="bg-blue-100 px-1 rounded">Brand</code> — manufacturer name</li>
                    <li><code className="bg-blue-100 px-1 rounded">Line</code> — product line name</li>
                    <li><code className="bg-blue-100 px-1 rounded">Class</code> — Material or Labor</li>
                    <li><code className="bg-blue-100 px-1 rounded">Trade</code> — Roofing, Siding, Gutters, Windows, Fascia & Soffit, General</li>
                    <li><code className="bg-blue-100 px-1 rounded">Unit</code> — EA, SQ, PC, RL, BX, LF, SF, HR, BD, PR</li>
                    <li><code className="bg-blue-100 px-1 rounded">Price</code> — unit price (numeric)</li>
                    <li><code className="bg-blue-100 px-1 rounded">Taxable</code> — Yes/No</li>
                  </ul>
                  <p className="mt-2 text-blue-700">Columns will be auto-matched by name. You can adjust mappings in the next step.</p>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-gray-700">Drop your CSV file here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                We found <strong>{csvHeaders.length} columns</strong> and <strong>{csvRows.length} rows</strong>. Map each CSV column to a catalog field.
              </p>

              <div className="space-y-3">
                {mappings.map((mapping, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{mapping.csvHeader}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        e.g. {csvRows.slice(0, 3).map(r => r[mapping.csvHeader]).filter(Boolean).join(', ') || '(empty)'}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <select
                      value={mapping.target}
                      onChange={e => updateMapping(i, e.target.value as TargetField)}
                      className={`w-52 px-3 py-2 border rounded-lg text-sm ${
                        mapping.target === '_skip' ? 'border-gray-300 text-gray-400' : 'border-primary/30 text-gray-900 bg-primary/5'
                      }`}
                    >
                      {TARGET_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!hasDescriptionMapping() && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  You must map at least one column to &quot;Item / Line&quot; to continue.
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                <strong>Defaults for unmapped columns:</strong> Trade = {TRADE_LABELS[activeTrade] || activeTrade}, Section = Materials, Unit = EA, Price = $0.00, Taxable = No
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              {/* Summary */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <span className="font-bold text-green-700">{validCount}</span> <span className="text-green-600">items ready</span>
                </div>
                {newCategoryNames.length > 0 && (
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <span className="font-bold text-blue-700">{newCategoryNames.length}</span> <span className="text-blue-600">new categories</span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <span className="font-bold text-amber-700">{warningCount}</span> <span className="text-amber-600">warnings</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <span className="font-bold text-red-700">{errorCount}</span> <span className="text-red-600">errors (will be skipped)</span>
                  </div>
                )}
              </div>

              {newCategoryNames.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <strong>New categories to create:</strong> {newCategoryNames.join(', ')}
                </div>
              )}

              {/* Preview table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 font-medium text-gray-500 w-8">#</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Item</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Category</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Brand</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Section</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Trade</th>
                        <th className="px-3 py-2 font-medium text-gray-500">Unit</th>
                        <th className="px-3 py-2 font-medium text-gray-500 text-right">Price</th>
                        <th className="px-3 py-2 font-medium text-gray-500 text-center">Tax</th>
                        <th className="px-3 py-2 font-medium text-gray-500 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewRows.map((row, i) => (
                        <tr key={i} className={row.description ? '' : 'bg-red-50'}>
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[200px] truncate">{row.description || <span className="text-red-500 italic">Missing</span>}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {row.category && (
                              <span className={existingCatNames.has(row.category.toLowerCase()) ? '' : 'text-blue-600 font-medium'}>
                                {row.category}{!existingCatNames.has(row.category.toLowerCase()) && ' *'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{row.brand}</td>
                          <td className="px-3 py-2 text-gray-600 capitalize">{row.section}</td>
                          <td className="px-3 py-2 text-gray-600">{TRADE_LABELS[row.trade] || row.trade}</td>
                          <td className="px-3 py-2 text-gray-600">{row.unit}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{row.unit_price > 0 ? `$${row.unit_price.toFixed(2)}` : '—'}</td>
                          <td className="px-3 py-2 text-center">{row.is_taxable ? '✓' : ''}</td>
                          <td className="px-3 py-2">
                            {row.warnings.length > 0 && (
                              <span className="text-amber-500" title={row.warnings.join(', ')}>⚠</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-2">* = new category (will be created on import)</p>

              {/* Import progress */}
              {importing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Importing...</span>
                    <span className="text-gray-500">{importProgress.done} / {importProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {step > 1 && !importing && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            {step === 2 && (
              <button
                onClick={buildPreview}
                disabled={!hasDescriptionMapping()}
                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                onClick={doImport}
                disabled={importing || validCount === 0}
                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : `Import ${validCount} Items`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
