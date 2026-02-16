import type { WasteCalcInputs } from './measurementMapper'

// ---------- Types ----------

export interface FormulaContext {
  measurements: Record<string, number>  // flat key-value from WasteCalcInputs
  waste: number                         // waste factor: (waste_pct + 100) / 100
  wastePct: number                      // raw waste percentage (e.g. 10, 15, 20)
  resolvedItems: Record<string, number> // description -> calculated qty
  materialVariant: string | null        // 'vinyl' | 'hardie' | 'lp_smartside'
}

export interface FormulaResult {
  value: number       // the calculated qty (rounded up via Math.ceil)
  rawValue: number    // before rounding
  error: string | null // parse/eval error message, null if success
}

// ---------- Token Resolution ----------

/**
 * Replace {variable} tokens in a formula string with numeric values from context.
 *
 * Supported tokens:
 *   {area}, {ridges}, etc.      -> context.measurements[key]
 *   {waste}                     -> context.waste (waste factor)
 *   {waste_pct}                 -> context.wastePct (raw percentage)
 *   {item:Some Description}     -> context.resolvedItems[description]
 *   {self:hardie}               -> 1 if materialVariant matches, 0 otherwise
 */
/**
 * Safely convert any value to a numeric string.
 * Objects, arrays, nulls, NaN all become '0'.
 */
function safeNumStr(val: unknown): string {
  if (typeof val === 'number' && isFinite(val)) return String(val)
  if (typeof val === 'string') {
    const p = parseFloat(val)
    return isFinite(p) ? String(p) : '0'
  }
  return '0'
}

function resolveTokens(formula: string, context: FormulaContext): { expression: string; error: string | null } {
  let error: string | null = null

  const expression = formula.replace(/\{([^}]+)\}/g, (match, token: string) => {
    const trimmed = token.trim()

    // Special: waste factor
    if (trimmed === 'waste') {
      return safeNumStr(context.waste)
    }

    // Special: raw waste percentage
    if (trimmed === 'waste_pct') {
      return safeNumStr(context.wastePct)
    }

    // Item dependency: {item:Description}
    if (trimmed.startsWith('item:')) {
      const description = trimmed.slice(5).trim()
      const value = context.resolvedItems[description]
      if (value === undefined) {
        error = `Unknown item dependency: "${description}"`
        return '0'
      }
      return safeNumStr(value)
    }

    // Material variant check: {self:hardie}, {self:vinyl}, etc.
    if (trimmed.startsWith('self:')) {
      const variant = trimmed.slice(5).trim()
      return context.materialVariant === variant ? '1' : '0'
    }

    // Measurement variable
    const value = context.measurements[trimmed]
    if (value === undefined) {
      error = `Unknown variable: {${trimmed}}`
      return '0'
    }
    return safeNumStr(value)
  })

  return { expression, error }
}

// ---------- Safe Math Evaluator ----------

/**
 * Safely evaluate a math expression string.
 * Only allows: digits, decimal points, +, -, *, /, (, ), spaces.
 * No variable names, function calls, or any other syntax.
 */
function safeEval(expression: string): { value: number; error: string | null } {
  // Strip whitespace for validation
  const cleaned = expression.replace(/\s+/g, '')

  // Validate: only allow safe characters
  if (!/^[0-9.+\-*/()]+$/.test(cleaned)) {
    return { value: 0, error: `Invalid characters in expression: ${expression}` }
  }

  // Check for empty expression
  if (cleaned.length === 0) {
    return { value: 0, error: 'Empty expression' }
  }

  try {
    // Use Function constructor for safe evaluation (no access to scope)
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${cleaned})`)()

    if (typeof result !== 'number' || !isFinite(result)) {
      return { value: 0, error: `Expression did not produce a valid number` }
    }

    return { value: result, error: null }
  } catch (e) {
    return { value: 0, error: `Evaluation error: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

// ---------- Main Evaluator ----------

/**
 * Evaluate a formula string with variable substitution and safe math.
 *
 * Examples:
 *   evaluateFormula("{area} / 100 * {waste}", context)
 *   evaluateFormula("({rakes} + {eaves}) / 116", context)
 *   evaluateFormula("{item:Shingles} / 15", context)
 */
export function evaluateFormula(formula: string, context: FormulaContext): FormulaResult {
  if (!formula || !formula.trim()) {
    return { value: 0, rawValue: 0, error: 'Empty formula' }
  }

  // Step 1: Replace tokens with values
  const { expression, error: tokenError } = resolveTokens(formula, context)

  // Safety check: if expression still contains '[object' it means an object leaked through
  if (expression.includes('[object')) {
    return { value: 0, rawValue: 0, error: `Object leaked into expression (likely a Hover data structure issue). Raw: ${expression}` }
  }

  // Step 2: Evaluate the math expression
  const { value: rawValue, error: evalError } = safeEval(expression)

  const error = tokenError || evalError

  // Step 3: Round up (matching wasteCalculator.ts behavior)
  const value = Math.max(0, Math.ceil(rawValue))

  return { value, rawValue, error }
}

// ---------- Helpers ----------

/**
 * Convert WasteCalcInputs to a flat Record<string, number> for use in FormulaContext.
 */
export function buildMeasurementContext(inputs: WasteCalcInputs): Record<string, number> {
  // Safely coerce all values to numbers — Hover data can sometimes
  // contain objects or strings where we expect numbers.
  // Uses the same logic as safeNumStr but returns a number.
  function n(val: unknown): number {
    if (typeof val === 'number' && isFinite(val)) return val
    if (typeof val === 'string') { const p = parseFloat(val); return isFinite(p) ? p : 0 }
    // Objects, arrays, null, undefined, booleans all become 0
    return 0
  }

  const ctx: Record<string, number> = {
    area: n(inputs.area),
    ridges: n(inputs.ridges),
    hips: n(inputs.hips),
    valleys: n(inputs.valleys),
    rakes: n(inputs.rakes),
    eaves: n(inputs.eaves),
    flashing: n(inputs.flashing),
    stepFlashing: n(inputs.stepFlashing),
    ridgeVentLength: n(inputs.ridgeVentLength),
    sidingArea: n(inputs.sidingArea),
    outsideCorners: n(inputs.outsideCorners),
    insideCorners: n(inputs.insideCorners),
    openingsPerimeter: n(inputs.openingsPerimeter),
    slopedTrim: n(inputs.slopedTrim),
    verticalTrim: n(inputs.verticalTrim),
    levelFrieze: n(inputs.levelFrieze),
    slopedFrieze: n(inputs.slopedFrieze),
    levelStarter: n(inputs.levelStarter),
    openingsSills: n(inputs.openingsSills),
    soffitSf: n(inputs.soffitSf),
    gutterDownCount: n(inputs.gutterDownCount),
    openingsTop: n(inputs.openingsTop),
    blockCount: n(inputs.blockCount),
    porchSoffit: n(inputs.porchSoffit),
  }

  return ctx
}

/**
 * All available measurement variable keys, grouped by trade.
 * Used by the admin UI to show a formula reference helper.
 */
export const MEASUREMENT_VARIABLES: Record<string, { key: string; label: string; unit: string }[]> = {
  roof: [
    { key: 'area', label: 'Roof Area', unit: 'sq ft' },
    { key: 'ridges', label: 'Ridges', unit: 'LF' },
    { key: 'hips', label: 'Hips', unit: 'LF' },
    { key: 'valleys', label: 'Valleys', unit: 'LF' },
    { key: 'rakes', label: 'Rakes', unit: 'LF' },
    { key: 'eaves', label: 'Eaves', unit: 'LF' },
    { key: 'flashing', label: 'Flashing', unit: 'LF' },
    { key: 'stepFlashing', label: 'Step Flashing', unit: 'LF' },
    { key: 'ridgeVentLength', label: 'Ridge Vent Length', unit: 'LF' },
  ],
  siding: [
    { key: 'sidingArea', label: 'Siding Area', unit: 'sq ft' },
    { key: 'outsideCorners', label: 'Outside Corners', unit: 'count' },
    { key: 'insideCorners', label: 'Inside Corners', unit: 'count' },
    { key: 'openingsPerimeter', label: 'Openings Perimeter', unit: 'LF' },
    { key: 'slopedTrim', label: 'Sloped Trim', unit: 'LF' },
    { key: 'verticalTrim', label: 'Vertical Trim', unit: 'LF' },
    { key: 'levelFrieze', label: 'Level Frieze', unit: 'LF' },
    { key: 'slopedFrieze', label: 'Sloped Frieze', unit: 'LF' },
    { key: 'levelStarter', label: 'Level Starter', unit: 'LF' },
    { key: 'openingsSills', label: 'Openings Sills', unit: 'LF' },
    { key: 'soffitSf', label: 'Soffit SF', unit: 'sq ft' },
    { key: 'openingsTop', label: 'Openings Top', unit: 'LF' },
    { key: 'blockCount', label: 'Block Count', unit: 'count' },
    { key: 'porchSoffit', label: 'Porch Soffit', unit: 'sq ft' },
  ],
  gutters: [
    { key: 'eaves', label: 'Eaves (Gutter Run)', unit: 'LF' },
    { key: 'gutterDownCount', label: 'Gutter Down Count', unit: 'count' },
  ],
  fascia_soffit: [
    { key: 'rakes', label: 'Rakes', unit: 'LF' },
    { key: 'eaves', label: 'Eaves', unit: 'LF' },
    { key: 'soffitSf', label: 'Soffit SF', unit: 'sq ft' },
    { key: 'porchSoffit', label: 'Porch Soffit', unit: 'sq ft' },
  ],
}
