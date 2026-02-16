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
function resolveTokens(formula: string, context: FormulaContext): { expression: string; error: string | null } {
  let error: string | null = null

  const expression = formula.replace(/\{([^}]+)\}/g, (match, token: string) => {
    const trimmed = token.trim()

    // Special: waste factor
    if (trimmed === 'waste') {
      return String(context.waste)
    }

    // Special: raw waste percentage
    if (trimmed === 'waste_pct') {
      return String(context.wastePct)
    }

    // Item dependency: {item:Description}
    if (trimmed.startsWith('item:')) {
      const description = trimmed.slice(5).trim()
      const value = context.resolvedItems[description]
      if (value === undefined) {
        error = `Unknown item dependency: "${description}"`
        return '0'
      }
      return String(value)
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
    return String(value)
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

  // Step 2: Evaluate the math expression
  const { value: rawValue, error: evalError } = safeEval(expression)

  const error = tokenError || evalError

  // Step 3: Round up (matching wasteCalculator.ts behavior)
  const value = Math.max(0, Math.ceil(rawValue))

  return { value, rawValue, error }
}

// ---------- Validation ----------

/**
 * Validate a formula string without evaluating it.
 * Checks syntax and extracts referenced variables.
 */
export function validateFormula(formula: string): {
  valid: boolean
  error: string | null
  variables: string[]
} {
  if (!formula || !formula.trim()) {
    return { valid: false, error: 'Empty formula', variables: [] }
  }

  const variables: string[] = []

  // Extract all {variable} tokens
  const tokenRegex = /\{([^}]+)\}/g
  let match
  while ((match = tokenRegex.exec(formula)) !== null) {
    variables.push(match[1].trim())
  }

  // Replace tokens with dummy value (1) and check math syntax
  const testExpression = formula.replace(/\{[^}]+\}/g, '1')
  const cleaned = testExpression.replace(/\s+/g, '')

  if (!/^[0-9.+\-*/()]+$/.test(cleaned)) {
    return {
      valid: false,
      error: `Invalid characters in formula (after variable substitution): ${cleaned}`,
      variables,
    }
  }

  // Try evaluating with dummy values
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${cleaned})`)()
    if (typeof result !== 'number' || !isFinite(result)) {
      return { valid: false, error: 'Formula does not produce a valid number', variables }
    }
  } catch (e) {
    return {
      valid: false,
      error: `Syntax error: ${e instanceof Error ? e.message : 'unknown'}`,
      variables,
    }
  }

  return { valid: true, error: null, variables }
}

// ---------- Helpers ----------

/**
 * Convert WasteCalcInputs to a flat Record<string, number> for use in FormulaContext.
 */
export function buildMeasurementContext(inputs: WasteCalcInputs): Record<string, number> {
  // Safely coerce all values to numbers — Hover data can sometimes
  // contain objects or strings where we expect numbers
  function n(val: unknown): number {
    if (typeof val === 'number' && isFinite(val)) return val
    if (typeof val === 'string') { const p = parseFloat(val); return isFinite(p) ? p : 0 }
    return 0
  }
  return {
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
