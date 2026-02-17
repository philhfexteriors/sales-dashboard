import type { HoverMeasurements } from './hoverTypes'
import type { BidLineItem } from '@/components/BidFormProvider'
import { calculateLineItemTotals } from '@/components/BidFormProvider'
import { extractWasteCalcInputs, extractWasteCalcInputsFromConfig, type MappingConfig } from './measurementMapper'
import { evaluateFormula, buildMeasurementContext, type FormulaContext } from './formulaEvaluator'

// ---------- Types ----------

export interface TemplateItemData {
  id: string
  section: 'materials' | 'labor'
  description: string
  unit: string
  default_qty_formula: string | null
  default_qty: number | null
  sort_order: number
  is_required: boolean
  measurement_key: string | null
  depends_on_item_id: string | null
  price_list: {
    id: string
    description: string
    unit: string
    unit_price: number
    is_taxable?: boolean
  } | null
}

export interface TemplateData {
  id: string
  trade: string
  name: string
  waste_pct: number
  bid_template_items: TemplateItemData[]
}

export interface TemplateApplicationConfig {
  wastePct: number           // resolved waste % (bid's trade-specific or template default)
  defaultMarginPct: number   // from bid.default_margin_pct
  materialVariant: string | null
}

// ---------- Topological Sort ----------

/**
 * Sort template items so that dependencies are evaluated before their dependents.
 * Items without depends_on come first.
 * Detects circular dependencies and breaks them.
 */
function topologicalSort(items: TemplateItemData[]): TemplateItemData[] {
  const sorted: TemplateItemData[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()  // cycle detection
  const itemMap = new Map(items.map(i => [i.id, i]))

  function visit(item: TemplateItemData) {
    if (visited.has(item.id)) return
    if (visiting.has(item.id)) {
      // Circular dependency detected — break the cycle
      return
    }

    visiting.add(item.id)

    // Visit dependency first
    if (item.depends_on_item_id) {
      const dep = itemMap.get(item.depends_on_item_id)
      if (dep) visit(dep)
    }

    visiting.delete(item.id)
    visited.add(item.id)
    sorted.push(item)
  }

  // Visit all items (preserving original sort_order as a tiebreaker)
  const orderedItems = [...items].sort((a, b) => a.sort_order - b.sort_order)
  for (const item of orderedItems) {
    visit(item)
  }

  return sorted
}

// ---------- Main Applicator ----------

/**
 * Apply a bid template to Hover measurements and produce BidLineItem[].
 *
 * This is the main orchestration function that:
 * 1. Extracts measurement inputs from Hover data
 * 2. Topologically sorts items by dependency
 * 3. Evaluates each item's formula
 * 4. Returns BidLineItem[] ready for setLineItems()
 *
 * @param template - The full template with items and linked price_list data
 * @param measurements - Hover measurement JSON (null if no Hover data)
 * @param config - Waste %, margin %, material variant
 */
export function applyTemplate(
  template: TemplateData,
  measurements: HoverMeasurements | null,
  config: TemplateApplicationConfig,
  mappings?: MappingConfig[] | null
): BidLineItem[] {
  // Step 1: Build measurement context (use config-driven extraction if mappings provided)
  const wasteCalcInputs = measurements
    ? (mappings?.length ? extractWasteCalcInputsFromConfig(measurements, mappings) : extractWasteCalcInputs(measurements))
    : null

  const measurementValues: Record<string, number> = wasteCalcInputs
    ? buildMeasurementContext(wasteCalcInputs)
    : {} // All measurements default to 0 when no Hover data

  // Step 2: Build waste factor
  const wasteFactor = (config.wastePct + 100) / 100

  // Step 3: Topological sort items by dependency
  const sortedItems = topologicalSort(template.bid_template_items)

  // Step 4: Evaluate each item's formula
  const resolvedItems: Record<string, number> = {}
  const lineItems: BidLineItem[] = []

  for (const item of sortedItems) {
    let qty = 0
    let qtySource: 'formula' | 'manual' = 'manual'
    let qtyFormula: string | null = null

    if (item.default_qty_formula) {
      // Build formula context
      const context: FormulaContext = {
        measurements: measurementValues,
        waste: wasteFactor,
        wastePct: config.wastePct,
        resolvedItems,
        materialVariant: config.materialVariant,
      }

      const result = evaluateFormula(item.default_qty_formula, context)

      // Formula errors are non-fatal — we use 0 as fallback

      qty = result.value
      qtySource = 'formula'
      qtyFormula = item.default_qty_formula
    } else if (item.default_qty !== null && item.default_qty !== undefined) {
      // Fixed quantity fallback
      qty = item.default_qty
      qtySource = 'manual'
    }

    // Store resolved qty for dependency lookups
    resolvedItems[item.description] = qty

    // Build BidLineItem
    const lineItem: BidLineItem = {
      price_list_id: item.price_list?.id || null,
      section: item.section,
      description: item.description,
      qty,
      unit: item.price_list?.unit || item.unit,
      unit_price: item.price_list?.unit_price || 0,
      margin_pct: config.defaultMarginPct,
      total_price: 0,
      total_margin: 0,
      line_total: 0,
      is_taxable: item.price_list?.is_taxable ?? (item.section === 'materials'),
      sort_order: item.sort_order,
      notes: null,
      qty_source: qtySource,
      qty_formula: qtyFormula,
      template_item_id: item.id,
    }

    lineItems.push(calculateLineItemTotals(lineItem))
  }

  // Step 5: Re-sort by section (materials first) then sort_order
  lineItems.sort((a, b) => {
    if (a.section !== b.section) {
      return a.section === 'materials' ? -1 : 1
    }
    return a.sort_order - b.sort_order
  })

  return lineItems
}
