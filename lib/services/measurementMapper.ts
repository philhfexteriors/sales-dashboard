import type { HoverMeasurements } from './hoverTypes'
import { parseFacadeData } from './hoverTypes'

// Waste calculator input variables extracted from Hover measurements
export interface WasteCalcInputs {
  // Roofing
  area: number             // total roof area in SQ/FT
  ridges: number           // ridge length in LF
  hips: number             // hip length in LF
  valleys: number          // valley length in LF
  rakes: number            // rake length in LF
  eaves: number            // eave length in LF
  flashing: number         // flashing length in LF
  stepFlashing: number     // step flashing length in LF
  ridgeVentLength: number  // ridge vent length in LF
  steepAreas: Record<string, number>  // pitch tier -> area in SQ/FT

  // Siding
  sidingArea: number         // total siding area in SQ/FT
  outsideCorners: number     // count
  insideCorners: number      // count
  openingsPerimeter: number  // total opening perimeter in LF
  slopedTrim: number         // LF
  verticalTrim: number       // LF
  levelFrieze: number        // LF
  slopedFrieze: number       // LF
  levelStarter: number       // LF
  openingsSills: number      // LF
  soffitSf: number           // soffit area in SQ/FT
  gutterDownCount: number    // count
  openingsTop: number        // LF (Hardie only)
  blockCount: number         // count (Hardie only)
  porchSoffit: number        // porch soffit area in SQ/FT
}

// ---------- Mapping Config Types ----------

export interface MappingConfig {
  id: string
  target_field: string
  target_label: string
  target_unit: string
  trade_group: string
  mapping_type: 'direct' | 'computed' | 'derived' | 'manual'
  hover_json_paths: string | null
  computation_id: string | null
  derived_formula: string | null
  default_value: number
  hover_source_category: string
  hover_source_description: string | null
  sort_order: number
}

// ---------- Default Mappings (used for DB seeding & reset) ----------

export const DEFAULT_MAPPINGS: Omit<MappingConfig, 'id'>[] = [
  // ── Roof ──
  { target_field: 'area', target_label: 'Roof Area', target_unit: 'sq ft', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.roof_facets.area|roof.area.total|roof.area.facets_total|roof.total_area', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Total roof facet area', sort_order: 0 },
  { target_field: 'ridges', target_label: 'Ridges + Hips', target_unit: 'LF', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.ridges_hips.length|roof.measurements.ridges|roof.ridges', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Combined ridges/hips length', sort_order: 1 },
  { target_field: 'hips', target_label: 'Hips', target_unit: 'LF', trade_group: 'roof', mapping_type: 'manual', hover_json_paths: null, computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'none', hover_source_description: 'Manual — Hover combines ridges+hips', sort_order: 2 },
  { target_field: 'valleys', target_label: 'Valleys', target_unit: 'LF', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.valleys.length|roof.measurements.valleys|roof.valleys', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Valley length', sort_order: 3 },
  { target_field: 'rakes', target_label: 'Rakes', target_unit: 'LF', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.rakes.length|roof.measurements.rakes|roof.rakes', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Rake length', sort_order: 4 },
  { target_field: 'eaves', target_label: 'Eaves', target_unit: 'LF', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.gutters_eaves.length|roofline.eaves_fascia.length|roof.measurements.gutters_eaves|roof.gutters_eaves', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Eave / gutter run length', sort_order: 5 },
  { target_field: 'flashing', target_label: 'Flashing', target_unit: 'LF', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.flashing.length|roof.measurements.flashing', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Flashing length', sort_order: 6 },
  { target_field: 'stepFlashing', target_label: 'Step Flashing', target_unit: 'LF', trade_group: 'roof', mapping_type: 'direct', hover_json_paths: 'roof.step_flashing.length|roof.measurements.step_flashing', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roof', hover_source_description: 'Step flashing length', sort_order: 7 },
  { target_field: 'ridgeVentLength', target_label: 'Ridge Vent Length', target_unit: 'LF', trade_group: 'roof', mapping_type: 'manual', hover_json_paths: null, computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'none', hover_source_description: 'Manual entry only', sort_order: 8 },
  // ── Siding ──
  { target_field: 'sidingArea', target_label: 'Siding Area', target_unit: 'sq ft', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'area.facades.siding|area.total.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'area', hover_source_description: 'Siding facade area from area summary', sort_order: 0 },
  { target_field: 'outsideCorners', target_label: 'Outside Corners', target_unit: 'count', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'corners.outside_corners_qty.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'corners', hover_source_description: 'Outside corner count', sort_order: 1 },
  { target_field: 'insideCorners', target_label: 'Inside Corners', target_unit: 'count', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'corners.inside_corners_qty.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'corners', hover_source_description: 'Inside corner count', sort_order: 2 },
  { target_field: 'openingsPerimeter', target_label: 'Openings Perimeter', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'openings.total_perimeter.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'openings', hover_source_description: 'Total opening perimeter (siding)', sort_order: 3 },
  { target_field: 'slopedTrim', target_label: 'Sloped Trim', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'trim.sloped_trim.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'trim', hover_source_description: 'Sloped trim length (siding)', sort_order: 4 },
  { target_field: 'verticalTrim', target_label: 'Vertical Trim', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'trim.vertical_trim.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'trim', hover_source_description: 'Vertical trim length (siding)', sort_order: 5 },
  { target_field: 'levelFrieze', target_label: 'Level Frieze', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'roofline.level_frieze_board.length', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roofline', hover_source_description: 'Level frieze board length', sort_order: 6 },
  { target_field: 'slopedFrieze', target_label: 'Sloped Frieze', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'roofline.sloped_frieze_board.length', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'roofline', hover_source_description: 'Sloped frieze board length', sort_order: 7 },
  { target_field: 'levelStarter', target_label: 'Level Starter', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'trim.level_starter.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'trim', hover_source_description: 'Level starter course length (siding)', sort_order: 8 },
  { target_field: 'openingsSills', target_label: 'Openings Sills', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'openings.sills_length.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'openings', hover_source_description: 'Opening sills length (siding)', sort_order: 9 },
  { target_field: 'soffitSf', target_label: 'Soffit SF', target_unit: 'sq ft', trade_group: 'siding', mapping_type: 'computed', hover_json_paths: null, computation_id: 'sum_soffit_areas', derived_formula: null, default_value: 0, hover_source_category: 'roofline', hover_source_description: 'Sum of level + sloped frieze soffit areas', sort_order: 10 },
  { target_field: 'gutterDownCount', target_label: 'Gutter Down Count', target_unit: 'count', trade_group: 'siding', mapping_type: 'manual', hover_json_paths: null, computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'none', hover_source_description: 'Manual entry only', sort_order: 11 },
  { target_field: 'openingsTop', target_label: 'Openings Top', target_unit: 'LF', trade_group: 'siding', mapping_type: 'direct', hover_json_paths: 'openings.tops_length.siding', computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'openings', hover_source_description: 'Opening tops length (siding)', sort_order: 12 },
  { target_field: 'blockCount', target_label: 'Block Count', target_unit: 'count', trade_group: 'siding', mapping_type: 'manual', hover_json_paths: null, computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'none', hover_source_description: 'Hardie only — manual entry', sort_order: 13 },
  { target_field: 'porchSoffit', target_label: 'Porch Soffit', target_unit: 'sq ft', trade_group: 'siding', mapping_type: 'manual', hover_json_paths: null, computation_id: null, derived_formula: null, default_value: 0, hover_source_category: 'none', hover_source_description: 'Manual entry only', sort_order: 14 },
]

// ---------- Computation Registry ----------

const COMPUTATION_REGISTRY: Record<string, (measurements: HoverMeasurements) => number> = {
  sum_facade_areas: (m) => {
    const facadeData = m.facades ? parseFacadeData(m) : []
    return facadeData.reduce((sum, f) => sum + f.totalArea, 0)
  },
  calc_openings_perimeter: (m) => {
    let perimeter = 0
    const windows = m.openings?.windows || []
    const doors = m.openings?.doors || []
    for (const w of windows) {
      const sizeMatch = w.width_x_height?.match(/(\d+)"\s*x\s*(\d+)"/)
      if (sizeMatch) {
        perimeter += 2 * (parseInt(sizeMatch[1]) + parseInt(sizeMatch[2])) / 12
      }
    }
    for (const d of doors) {
      const sizeMatch = d.width_x_height?.match(/(\d+)"\s*x\s*(\d+)"/)
      if (sizeMatch) {
        perimeter += 2 * (parseInt(sizeMatch[1]) + parseInt(sizeMatch[2])) / 12
      }
    }
    return perimeter
  },
  sum_soffit_areas: (m) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = m as any
    const roofline = r.roofline
    if (!roofline || typeof roofline !== 'object') return 0
    const levelSoffit = toNum(roofline.level_frieze_board?.soffit_area)
    const slopedSoffit = toNum(roofline.sloped_frieze_board?.soffit_area)
    return levelSoffit + slopedSoffit
  },
}

export const AVAILABLE_COMPUTATIONS: { id: string; label: string; description: string }[] = [
  { id: 'sum_facade_areas', label: 'Sum Facade Areas', description: 'Sums area from all facade entries (old format)' },
  { id: 'calc_openings_perimeter', label: 'Calc Openings Perimeter', description: 'Calculates perimeter from window/door dimensions (old format)' },
  { id: 'sum_soffit_areas', label: 'Sum Soffit Areas', description: 'Sums level + sloped frieze soffit areas from roofline' },
]

// ---------- JSON Path Resolver ----------

function resolveJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function resolveDirectMapping(measurements: HoverMeasurements, pathsStr: string): number {
  const paths = pathsStr.split('|')
  for (const path of paths) {
    const val = toNum(resolveJsonPath(measurements, path.trim()))
    if (val !== 0) return val
  }
  return 0
}

// ---------- Config-Driven Extraction ----------

/**
 * Extract waste calc inputs using database-stored mapping configuration.
 * Falls back to default_value for any field where Hover data is unavailable.
 */
export function extractWasteCalcInputsFromConfig(
  measurements: HoverMeasurements,
  mappings: MappingConfig[]
): WasteCalcInputs {
  const resolved: Record<string, number> = {}

  // Phase 1: Resolve direct and computed mappings
  for (const mapping of mappings) {
    if (mapping.mapping_type === 'direct' && mapping.hover_json_paths) {
      resolved[mapping.target_field] = resolveDirectMapping(measurements, mapping.hover_json_paths)
    } else if (mapping.mapping_type === 'computed' && mapping.computation_id) {
      const fn = COMPUTATION_REGISTRY[mapping.computation_id]
      resolved[mapping.target_field] = fn ? fn(measurements) : mapping.default_value
    } else if (mapping.mapping_type === 'manual') {
      resolved[mapping.target_field] = mapping.default_value
    }
    // Skip 'derived' for now — resolved in phase 2
  }

  // Phase 2: Resolve derived mappings (reference other resolved fields)
  for (const mapping of mappings) {
    if (mapping.mapping_type === 'derived' && mapping.derived_formula) {
      const expression = mapping.derived_formula.replace(/\{([^}]+)\}/g, (_match, token: string) => {
        const val = resolved[token.trim()]
        return val !== undefined ? String(val) : '0'
      })
      try {
        const cleaned = expression.replace(/\s+/g, '')
        if (/^[0-9.+\-*/()]+$/.test(cleaned)) {
          // eslint-disable-next-line no-new-func
          const result = new Function(`return (${cleaned})`)()
          resolved[mapping.target_field] = typeof result === 'number' && isFinite(result) ? result : mapping.default_value
        } else {
          resolved[mapping.target_field] = mapping.default_value
        }
      } catch {
        resolved[mapping.target_field] = mapping.default_value
      }
    }
  }

  // Apply defaults for any missing fields
  for (const mapping of mappings) {
    if (resolved[mapping.target_field] === undefined) {
      resolved[mapping.target_field] = mapping.default_value
    }
  }

  return {
    area: resolved.area ?? 0,
    ridges: resolved.ridges ?? 0,
    hips: resolved.hips ?? 0,
    valleys: resolved.valleys ?? 0,
    rakes: resolved.rakes ?? 0,
    eaves: resolved.eaves ?? 0,
    flashing: resolved.flashing ?? 0,
    stepFlashing: resolved.stepFlashing ?? 0,
    ridgeVentLength: resolved.ridgeVentLength ?? 0,
    steepAreas: {},
    sidingArea: resolved.sidingArea ?? 0,
    outsideCorners: resolved.outsideCorners ?? 0,
    insideCorners: resolved.insideCorners ?? 0,
    openingsPerimeter: resolved.openingsPerimeter ?? 0,
    slopedTrim: resolved.slopedTrim ?? 0,
    verticalTrim: resolved.verticalTrim ?? 0,
    levelFrieze: resolved.levelFrieze ?? 0,
    slopedFrieze: resolved.slopedFrieze ?? 0,
    levelStarter: resolved.levelStarter ?? 0,
    openingsSills: resolved.openingsSills ?? 0,
    soffitSf: resolved.soffitSf ?? 0,
    gutterDownCount: resolved.gutterDownCount ?? 0,
    openingsTop: resolved.openingsTop ?? 0,
    blockCount: resolved.blockCount ?? 0,
    porchSoffit: resolved.porchSoffit ?? 0,
  }
}

// ---------- Original Hardcoded Extraction (kept as fallback) ----------

/**
 * Extract waste calculator input variables from Hover measurement data.
 * Maps Hover's JSON structure to our flat input format for the waste calculator.
 *
 * Note: Hover provides facade/opening data well, but roof detail (ridges, hips,
 * valleys, etc.) may need supplemental manual input. This mapper extracts what
 * it can and defaults the rest to 0.
 */
export function extractWasteCalcInputs(measurements: HoverMeasurements): WasteCalcInputs {
  // Parse facade data (with null guard)
  const facadeData = measurements.facades ? parseFacadeData(measurements) : []
  const totalFacadeArea = facadeData.reduce((sum, f) => sum + f.totalArea, 0)

  // Estimate opening perimeter from window/door data (with null guards)
  let openingsPerimeter = 0
  const windows = measurements.openings?.windows || []
  const doors = measurements.openings?.doors || []
  for (const w of windows) {
    const sizeMatch = w.width_x_height?.match(/(\d+)"\s*x\s*(\d+)"/)
    if (sizeMatch) {
      const width = parseInt(sizeMatch[1])
      const height = parseInt(sizeMatch[2])
      openingsPerimeter += 2 * (width + height) / 12 // convert inches to feet
    }
  }
  for (const d of doors) {
    const sizeMatch = d.width_x_height?.match(/(\d+)"\s*x\s*(\d+)"/)
    if (sizeMatch) {
      const width = parseInt(sizeMatch[1])
      const height = parseInt(sizeMatch[2])
      openingsPerimeter += 2 * (width + height) / 12
    }
  }

  // Extract roof data if available (Hover may include this in summary or separate keys)
  const roofData = extractRoofData(measurements)

  // Extract flashing/step flashing from Hover roof.measurements if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hoverRoof = (measurements as any).roof
  const hoverRoofMeas = hoverRoof?.measurements && typeof hoverRoof.measurements === 'object' ? hoverRoof.measurements : hoverRoof
  const flashing = hoverRoofMeas ? toNum(hoverRoofMeas.flashing) : 0
  const stepFlashing = hoverRoofMeas ? toNum(hoverRoofMeas.step_flashing) : 0

  return {
    // Roofing
    area: roofData.area,
    ridges: roofData.ridges,
    hips: roofData.hips,
    valleys: roofData.valleys,
    rakes: roofData.rakes,
    eaves: roofData.eaves,
    flashing,
    stepFlashing,
    ridgeVentLength: 0, // typically manual input
    steepAreas: {},     // typically manual input per pitch tier

    // Siding
    sidingArea: totalFacadeArea,
    outsideCorners: 0,    // needs Hover 3D model data or manual
    insideCorners: 0,     // needs Hover 3D model data or manual
    openingsPerimeter,
    slopedTrim: 0,        // typically manual
    verticalTrim: 0,      // typically manual
    levelFrieze: 0,       // typically manual
    slopedFrieze: 0,      // typically manual
    levelStarter: 0,      // estimate from eave length if available
    openingsSills: openingsPerimeter / 4, // rough estimate: sills ~ 1/4 of perimeter
    soffitSf: 0,          // typically manual
    gutterDownCount: 0,   // typically manual
    openingsTop: 0,       // Hardie only, typically manual
    blockCount: 0,        // Hardie only, typically manual
    porchSoffit: 0,       // typically manual
  }
}

/**
 * Safely extract a numeric value from Hover data.
 * Hover may return numbers, strings, objects, or nested structures.
 */
function toNum(val: unknown): number {
  if (typeof val === 'number' && isFinite(val)) return val
  if (typeof val === 'string') {
    const parsed = parseFloat(val)
    return isFinite(parsed) ? parsed : 0
  }
  return 0
}

function extractRoofData(measurements: HoverMeasurements): {
  area: number
  ridges: number
  hips: number
  valleys: number
  rakes: number
  eaves: number
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = measurements as any
  const roof = m.roof || m.roof_summary

  if (!roof || typeof roof !== 'object') {
    return { area: 0, ridges: 0, hips: 0, valleys: 0, rakes: 0, eaves: 0 }
  }

  // Area: try roof.area.total first (full_json), then flat keys
  let area = 0
  if (roof.area && typeof roof.area === 'object' && roof.area !== null) {
    area = toNum(roof.area.total) || toNum(roof.area.facets_total)
  }
  if (!area) {
    area = toNum(roof.total_area)
  }
  // Fallback: sum facets if facets array exists
  if (!area && Array.isArray(roof.facets)) {
    area = roof.facets.reduce((sum: number, f: { area?: unknown }) => sum + toNum(f.area), 0)
  }

  // Linear measurements: try roof.measurements.* first (full_json), then flat keys
  const meas = (roof.measurements && typeof roof.measurements === 'object') ? roof.measurements : roof
  const ridges = toNum(meas.ridges) || toNum(meas.ridge_length)
  const hips = toNum(meas.hips) || toNum(meas.hip_length)
  const valleys = toNum(meas.valleys) || toNum(meas.valley_length)
  const rakes = toNum(meas.rakes) || toNum(meas.rake_length)
  // Hover uses "gutters_eaves" for eave linear footage
  const eaves = toNum(meas.eaves) || toNum(meas.gutters_eaves) || toNum(meas.eave_length)

  return { area, ridges, hips, valleys, rakes, eaves }
}
