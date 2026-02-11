'use client'

import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

// ---------- Types ----------

export interface PlanData {
  id?: string
  status: string
  is_retail: boolean
  is_insurance: boolean
  cc_account_id: number | null
  client_name: string
  client_address: string
  client_city: string
  client_state: string
  client_zip: string
  client_phone: string
  client_email: string
  has_roof: boolean
  has_siding: boolean
  has_guttering: boolean
  has_windows: boolean
  has_small_jobs: boolean
  sale_price: number | null
  insurance_proceeds: number | null
  down_payment: number | null
  out_of_pocket: number | null
  signature_data: string | null
  signed_at: string | null
  signed_by_name: string | null
  salesperson_signature_data: string | null
  salesperson_name: string | null
  plan_date: string | null
  shingle_initials_data: string | null
  start_date_window_id: string | null
  payment_notes: string | null
  discount_value: number | null
  discount_type: string | null
  approx_start_date?: string | null
}

export interface LineItem {
  id?: string
  plan_id?: string
  section: string
  field_key: string
  sort_order: number
  selections: Record<string, string> | null
  options: Record<string, unknown> | null
  description: string | null
  notes: string | null
  amount: number
}

interface PlanFormContextType {
  plan: PlanData
  lineItems: LineItem[]
  loading: boolean
  saving: boolean
  dirty: boolean
  updatePlan: (updates: Partial<PlanData>) => void
  updateLineItem: (fieldKey: string, section: string, updates: Partial<LineItem>) => void
  getLineItem: (fieldKey: string, section: string) => LineItem | undefined
  addCustomLineItem: (section: string, description?: string) => void
  removeLineItem: (fieldKey: string, section: string) => void
  saveNow: () => Promise<void>
  calculateTotals: () => void
}

const defaultPlan: PlanData = {
  status: 'draft',
  is_retail: false,
  is_insurance: false,
  cc_account_id: null,
  client_name: '',
  client_address: '',
  client_city: '',
  client_state: '',
  client_zip: '',
  client_phone: '',
  client_email: '',
  has_roof: false,
  has_siding: false,
  has_guttering: false,
  has_windows: false,
  has_small_jobs: false,
  sale_price: null,
  insurance_proceeds: null,
  down_payment: null,
  out_of_pocket: null,
  signature_data: null,
  signed_at: null,
  signed_by_name: null,
  salesperson_signature_data: null,
  salesperson_name: null,
  plan_date: null,
  shingle_initials_data: null,
  start_date_window_id: null,
  payment_notes: null,
  discount_value: null,
  discount_type: null,
}

const PlanFormContext = createContext<PlanFormContextType>({
  plan: defaultPlan,
  lineItems: [],
  loading: true,
  saving: false,
  dirty: false,
  updatePlan: () => {},
  updateLineItem: () => {},
  getLineItem: () => undefined,
  addCustomLineItem: () => {},
  removeLineItem: () => {},
  saveNow: async () => {},
  calculateTotals: () => {},
})

// ---------- Provider ----------

export function PlanFormProvider({
  planId,
  children,
}: {
  planId: string
  children: React.ReactNode
}) {
  const [plan, setPlan] = useState<PlanData>(defaultPlan)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const customCounterRef = useRef(0)

  // Load plan on mount
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/plans/${planId}`)
      if (res.ok) {
        const data = await res.json()
        setPlan(data.plan)
        setLineItems(data.lineItems)
        // Count existing custom items to set counter
        const customItems = data.lineItems.filter((li: LineItem) => li.field_key.includes('custom_'))
        customCounterRef.current = customItems.length
      }
      setLoading(false)
    }
    load()
  }, [planId])

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
  }, [dirty, plan, lineItems])

  const performSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: {
            is_retail: plan.is_retail,
            is_insurance: plan.is_insurance,
            cc_account_id: plan.cc_account_id,
            client_name: plan.client_name,
            client_address: plan.client_address,
            client_city: plan.client_city,
            client_state: plan.client_state,
            client_zip: plan.client_zip,
            client_phone: plan.client_phone,
            client_email: plan.client_email,
            has_roof: plan.has_roof,
            has_siding: plan.has_siding,
            has_guttering: plan.has_guttering,
            has_windows: plan.has_windows,
            has_small_jobs: plan.has_small_jobs,
            sale_price: plan.sale_price,
            insurance_proceeds: plan.insurance_proceeds,
            down_payment: plan.down_payment,
            out_of_pocket: plan.out_of_pocket,
            start_date_window_id: plan.start_date_window_id,
            payment_notes: plan.payment_notes,
            discount_value: plan.discount_value,
            discount_type: plan.discount_type,
            signature_data: plan.signature_data,
            signed_at: plan.signed_at,
            signed_by_name: plan.signed_by_name,
            salesperson_signature_data: plan.salesperson_signature_data,
            salesperson_name: plan.salesperson_name,
            plan_date: plan.plan_date,
            shingle_initials_data: plan.shingle_initials_data,
          },
          lineItems,
        }),
      })
      if (res.ok) {
        setDirty(false)
      }
    } catch {
      // Silent fail on auto-save
    }
    setSaving(false)
  }, [planId, plan, lineItems, saving])

  const updatePlan = useCallback((updates: Partial<PlanData>) => {
    setPlan(prev => ({ ...prev, ...updates }))
    setDirty(true)
  }, [])

  const getLineItem = useCallback((fieldKey: string, section: string) => {
    return lineItems.find(li => li.field_key === fieldKey && li.section === section)
  }, [lineItems])

  const updateLineItem = useCallback((fieldKey: string, section: string, updates: Partial<LineItem>) => {
    setLineItems(prev => {
      const idx = prev.findIndex(li => li.field_key === fieldKey && li.section === section)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], ...updates }
        return updated
      }
      // Create new line item
      return [...prev, {
        section,
        field_key: fieldKey,
        sort_order: prev.filter(li => li.section === section).length,
        selections: null,
        options: null,
        description: null,
        notes: null,
        amount: 0,
        ...updates,
      }]
    })
    setDirty(true)
  }, [])

  const addCustomLineItem = useCallback((section: string, description?: string) => {
    customCounterRef.current += 1
    const fieldKey = `${section}_custom_${customCounterRef.current}`
    setLineItems(prev => [...prev, {
      section,
      field_key: fieldKey,
      sort_order: prev.filter(li => li.section === section).length,
      selections: null,
      options: null,
      description: description || '',
      notes: null,
      amount: 0,
    }])
    setDirty(true)
  }, [])

  const removeLineItem = useCallback((fieldKey: string, section: string) => {
    setLineItems(prev => prev.filter(li => !(li.field_key === fieldKey && li.section === section)))
    setDirty(true)
  }, [])

  const calculateTotals = useCallback(() => {
    const total = lineItems.reduce((sum, li) => sum + (li.amount || 0), 0)
    const salePrice = Math.round(total * 100) / 100

    let outOfPocket: number | null = null
    if (plan.is_insurance && plan.insurance_proceeds != null) {
      outOfPocket = Math.round((salePrice - plan.insurance_proceeds) * 100) / 100
    } else if (plan.is_retail && plan.down_payment != null) {
      outOfPocket = Math.round((salePrice - plan.down_payment) * 100) / 100
    }

    setPlan(prev => ({ ...prev, sale_price: salePrice, out_of_pocket: outOfPocket }))
    setDirty(true)
  }, [lineItems, plan.is_insurance, plan.insurance_proceeds, plan.is_retail, plan.down_payment])

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await performSave()
    toast.success('Saved')
  }, [performSave])

  return (
    <PlanFormContext.Provider value={{
      plan, lineItems, loading, saving, dirty,
      updatePlan, updateLineItem, getLineItem,
      addCustomLineItem, removeLineItem,
      saveNow, calculateTotals,
    }}>
      {children}
    </PlanFormContext.Provider>
  )
}

export const usePlanForm = () => useContext(PlanFormContext)
