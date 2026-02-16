import { SupabaseClient } from '@supabase/supabase-js'

interface ConversionResult {
  planId: string
  success: boolean
  error?: string
}

// Map bid trade to production plan section flags
const tradeToSectionFlags: Record<string, Record<string, boolean>> = {
  roof: { has_roof: true },
  siding: { has_siding: true },
  gutters: { has_guttering: true },
  windows: { has_windows: true },
  fascia_soffit: { has_siding: true },
}

// Map bid trade to plan_line_items section name
const tradeToPlanSection: Record<string, string> = {
  roof: 'roof',
  siding: 'siding',
  gutters: 'guttering',
  windows: 'windows',
  fascia_soffit: 'siding',
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 50)
}

export async function convertBidToPlan(
  bidId: string,
  supabase: SupabaseClient
): Promise<ConversionResult> {
  try {
    // 1. Load bid
    const { data: bid, error: bidErr } = await supabase
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .single()

    if (bidErr || !bid) {
      return { planId: '', success: false, error: 'Bid not found' }
    }

    // 2. Get current version
    const { data: version } = await supabase
      .from('bid_versions')
      .select('id')
      .eq('bid_id', bidId)
      .neq('status', 'superseded')
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    // 3. Get line items
    let lineItems: Array<{
      description: string
      section: string
      qty: number
      unit: string
      line_total: number
      notes: string | null
      price_list_id: string | null
    }> = []

    if (version) {
      const { data: items } = await supabase
        .from('bid_line_items')
        .select('description, section, qty, unit, line_total, notes, price_list_id')
        .eq('version_id', version.id)
        .order('section')
        .order('sort_order')

      lineItems = items || []
    }

    // 4. Create production plan
    const sectionFlags = tradeToSectionFlags[bid.trade] || {}
    const { data: plan, error: planErr } = await supabase
      .from('production_plans')
      .insert({
        created_by: bid.created_by,
        status: 'draft',
        is_retail: true,
        is_insurance: false,
        cc_account_id: bid.cc_account_id,
        client_name: bid.client_name,
        client_address: bid.client_address,
        client_city: bid.client_city,
        client_state: bid.client_state,
        client_zip: bid.client_zip,
        client_phone: bid.client_phone,
        client_email: bid.client_email,
        sale_price: bid.grand_total,
        ...sectionFlags,
      })
      .select()
      .single()

    if (planErr || !plan) {
      return { planId: '', success: false, error: planErr?.message || 'Failed to create plan' }
    }

    // 5. Map bid line items to plan line items
    if (lineItems.length > 0) {
      const planSection = tradeToPlanSection[bid.trade] || 'misc'
      const planLineItems = lineItems.map((item, index) => ({
        plan_id: plan.id,
        section: planSection,
        field_key: item.price_list_id ? `${planSection}_catalog_${index + 1}` : slugify(item.description),
        sort_order: index,
        selections: null,
        options: item.price_list_id ? { qty: item.qty, unit_price: item.line_total / (item.qty || 1), unit: item.unit } : null,
        description: item.description,
        notes: item.notes,
        amount: item.line_total,
        price_list_id: item.price_list_id || null,
      }))

      await supabase.from('plan_line_items').insert(planLineItems)
    }

    // 6. Link bid to plan
    await supabase
      .from('bids')
      .update({ production_plan_id: plan.id })
      .eq('id', bidId)

    return { planId: plan.id, success: true }
  } catch (err) {
    return {
      planId: '',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
