'use client'

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

// ---------- Types ----------

export interface BidData {
  id?: string
  status: string
  cc_account_id: number | null
  cc_project_id: number | null
  hover_job_id: number | null
  hover_model_id: number | null
  hover_address: string | null
  client_name: string
  client_address: string
  client_city: string
  client_state: string
  client_zip: string
  client_phone: string
  client_email: string
  trade: string
  template_id: string | null
  default_margin_pct: number
  pitch: string | null
  stories: number
  material_type: string | null
  material_variant: string | null
  labor_difficulty: string | null
  waste_pct_roof: number
  waste_pct_siding: number
  waste_pct_fascia: number
  measurements_json: Record<string, unknown> | null
  tax_rate: number
  materials_total: number
  labor_total: number
  tax_total: number
  grand_total: number
  margin_total: number
  notes: string | null
  current_version_id?: string
}

export interface BidLineItem {
  id?: string
  bid_id?: string
  version_id?: string
  price_list_id: string | null
  section: 'materials' | 'labor'
  description: string
  qty: number
  unit: string
  unit_price: number
  margin_pct: number
  total_price: number
  total_margin: number
  line_total: number
  is_taxable: boolean
  sort_order: number
  notes: string | null
  qty_source: 'hover' | 'manual' | 'formula' | null
  qty_formula: string | null
}

interface BidFormContextType {
  bid: BidData
  lineItems: BidLineItem[]
  loading: boolean
  saving: boolean
  dirty: boolean
  updateBid: (updates: Partial<BidData>) => void
  updateLineItem: (index: number, updates: Partial<BidLineItem>) => void
  addLineItem: (section: 'materials' | 'labor', item?: Partial<BidLineItem>) => void
  removeLineItem: (index: number) => void
  setLineItems: (items: BidLineItem[]) => void
  calculateTotals: () => void
  saveNow: () => Promise<void>
}

const defaultBid: BidData = {
  status: 'draft',
  cc_account_id: null,
  cc_project_id: null,
  hover_job_id: null,
  hover_model_id: null,
  hover_address: null,
  client_name: '',
  client_address: '',
  client_city: '',
  client_state: '',
  client_zip: '',
  client_phone: '',
  client_email: '',
  trade: 'siding',
  template_id: null,
  default_margin_pct: 30,
  pitch: null,
  stories: 1,
  material_type: null,
  material_variant: null,
  labor_difficulty: 'standard',
  waste_pct_roof: 10,
  waste_pct_siding: 30,
  waste_pct_fascia: 15,
  measurements_json: null,
  tax_rate: 0,
  materials_total: 0,
  labor_total: 0,
  tax_total: 0,
  grand_total: 0,
  margin_total: 0,
  notes: null,
}

const BidFormContext = createContext<BidFormContextType>({
  bid: defaultBid,
  lineItems: [],
  loading: true,
  saving: false,
  dirty: false,
  updateBid: () => {},
  updateLineItem: () => {},
  addLineItem: () => {},
  removeLineItem: () => {},
  setLineItems: () => {},
  calculateTotals: () => {},
  saveNow: async () => {},
})

// ---------- Helpers ----------

export function calculateLineItemTotals(item: BidLineItem): BidLineItem {
  const total_price = Math.round(item.qty * item.unit_price * 100) / 100
  const total_margin = Math.round(total_price * item.margin_pct / 100 * 100) / 100
  const line_total = Math.round((total_price + total_margin) * 100) / 100
  return { ...item, total_price, total_margin, line_total }
}

// ---------- Provider ----------

export function BidFormProvider({
  bidId,
  children,
}: {
  bidId: string
  children: React.ReactNode
}) {
  const [bid, setBid] = useState<BidData>(defaultBid)
  const [lineItems, setLineItemsState] = useState<BidLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load bid on mount
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bids/${bidId}`)
      if (res.ok) {
        const data = await res.json()
        setBid(data.bid)
        setLineItemsState(data.lineItems || [])
      }
      setLoading(false)
    }
    load()
  }, [bidId])

  // Auto-save when dirty (debounced 5s)
  useEffect(() => {
    if (!dirty || loading) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      performSave()
    }, 5000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, bid, lineItems])

  const performSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bids/${bidId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, lineItems }),
      })
      if (res.ok) {
        setDirty(false)
      }
    } catch {
      // Silent fail on auto-save
    }
    setSaving(false)
  }, [bidId, bid, lineItems, saving])

  const updateBid = useCallback((updates: Partial<BidData>) => {
    setBid(prev => ({ ...prev, ...updates }))
    setDirty(true)
  }, [])

  const updateLineItem = useCallback((index: number, updates: Partial<BidLineItem>) => {
    setLineItemsState(prev => {
      const updated = [...prev]
      updated[index] = calculateLineItemTotals({ ...updated[index], ...updates })
      return updated
    })
    setDirty(true)
  }, [])

  const addLineItem = useCallback((section: 'materials' | 'labor', item?: Partial<BidLineItem>) => {
    const newItem: BidLineItem = {
      price_list_id: null,
      section,
      description: '',
      qty: 0,
      unit: 'EA',
      unit_price: 0,
      margin_pct: bid.default_margin_pct,
      total_price: 0,
      total_margin: 0,
      line_total: 0,
      is_taxable: section === 'materials',
      sort_order: lineItems.filter(li => li.section === section).length,
      notes: null,
      qty_source: 'manual',
      qty_formula: null,
      ...item,
    }
    setLineItemsState(prev => [...prev, calculateLineItemTotals(newItem)])
    setDirty(true)
  }, [bid.default_margin_pct, lineItems])

  const removeLineItem = useCallback((index: number) => {
    setLineItemsState(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }, [])

  const setLineItems = useCallback((items: BidLineItem[]) => {
    setLineItemsState(items.map(calculateLineItemTotals))
    setDirty(true)
  }, [])

  const calculateTotals = useCallback(() => {
    const materialsItems = lineItems.filter(li => li.section === 'materials')
    const laborItems = lineItems.filter(li => li.section === 'labor')

    const materials_total = materialsItems.reduce((sum, li) => sum + li.total_price, 0)
    const labor_total = laborItems.reduce((sum, li) => sum + li.total_price, 0)
    const margin_total = lineItems.reduce((sum, li) => sum + li.total_margin, 0)

    // Tax on taxable items (price + margin)
    const taxableTotal = lineItems
      .filter(li => li.is_taxable)
      .reduce((sum, li) => sum + li.line_total, 0)
    const tax_total = Math.round(taxableTotal * bid.tax_rate / 100 * 100) / 100

    // Grand total = all line totals (P+M) + tax
    const grand_total = Math.round(
      (lineItems.reduce((sum, li) => sum + li.line_total, 0) + tax_total) * 100
    ) / 100

    setBid(prev => ({
      ...prev,
      materials_total: Math.round(materials_total * 100) / 100,
      labor_total: Math.round(labor_total * 100) / 100,
      tax_total,
      grand_total,
      margin_total: Math.round(margin_total * 100) / 100,
    }))
    setDirty(true)
  }, [lineItems, bid.tax_rate])

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await performSave()
    toast.success('Saved')
  }, [performSave])

  return (
    <BidFormContext.Provider value={{
      bid, lineItems, loading, saving, dirty,
      updateBid, updateLineItem, addLineItem,
      removeLineItem, setLineItems,
      calculateTotals, saveNow,
    }}>
      {children}
    </BidFormContext.Provider>
  )
}

export const useBidForm = () => useContext(BidFormContext)
