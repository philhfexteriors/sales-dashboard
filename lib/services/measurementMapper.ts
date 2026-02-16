import type { HoverMeasurements } from './hoverTypes'
import { parseFacadeData } from './hoverTypes'
import { calculateWaste, type WasteCalcConfig } from './wasteCalculator'
import type { BidLineItem } from '@/components/BidFormProvider'
import { calculateLineItemTotals } from '@/components/BidFormProvider'

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

  return {
    // Roofing
    area: roofData.area,
    ridges: roofData.ridges,
    hips: roofData.hips,
    valleys: roofData.valleys,
    rakes: roofData.rakes,
    eaves: roofData.eaves,
    flashing: 0,       // typically manual input
    stepFlashing: 0,    // typically manual input
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
 * Extract roof measurements from Hover data.
 * Hover's full_json may include roof-level summary data.
 */
function extractRoofData(measurements: HoverMeasurements): {
  area: number
  ridges: number
  hips: number
  valleys: number
  rakes: number
  eaves: number
} {
  // Hover sometimes includes roof data in the summary or as a top-level key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roof = (measurements as any).roof || (measurements as any).roof_summary
  if (roof) {
    return {
      area: roof.total_area || roof.area || 0,
      ridges: roof.ridges || roof.ridge_length || 0,
      hips: roof.hips || roof.hip_length || 0,
      valleys: roof.valleys || roof.valley_length || 0,
      rakes: roof.rakes || roof.rake_length || 0,
      eaves: roof.eaves || roof.eave_length || 0,
    }
  }

  return { area: 0, ridges: 0, hips: 0, valleys: 0, rakes: 0, eaves: 0 }
}

/**
 * Get a summary of what Hover data is available vs what needs manual input.
 */
export function getMeasurementCoverage(inputs: WasteCalcInputs): {
  available: string[]
  needsManualInput: string[]
} {
  const available: string[] = []
  const needsManualInput: string[] = []

  // Check each field group
  if (inputs.area > 0) available.push('Roof Area')
  else needsManualInput.push('Roof Area')

  if (inputs.ridges > 0) available.push('Ridges')
  else needsManualInput.push('Ridges')

  if (inputs.eaves > 0) available.push('Eaves')
  else needsManualInput.push('Eaves')

  if (inputs.rakes > 0) available.push('Rakes')
  else needsManualInput.push('Rakes')

  if (inputs.sidingArea > 0) available.push('Siding Area')
  else needsManualInput.push('Siding Area')

  if (inputs.openingsPerimeter > 0) available.push('Openings Perimeter')
  else needsManualInput.push('Openings Perimeter')

  if (inputs.outsideCorners > 0) available.push('Outside Corners')
  else needsManualInput.push('Outside Corners')

  // Always manual
  needsManualInput.push('Flashing', 'Step Flashing', 'Ridge Vent', 'Steep Fee Areas')
  needsManualInput.push('Trim lengths', 'Soffit SF', 'Porch Soffit')

  return { available, needsManualInput }
}

/**
 * Apply the waste calculator to Hover measurements and produce BidLineItem[].
 * This is the main orchestration function called from the bid wizard.
 *
 * @param measurements - Raw Hover measurement JSON
 * @param config - Waste calculator configuration (waste %, material variant)
 * @param trade - Trade type (roof, siding, gutters, fascia_soffit)
 * @param defaultMarginPct - Default margin percentage from the bid
 * @returns BidLineItem[] ready to be passed to setLineItems()
 */
export function applyWasteCalculator(
  measurements: HoverMeasurements,
  config: WasteCalcConfig,
  trade: string,
  defaultMarginPct: number
): BidLineItem[] {
  const inputs = extractWasteCalcInputs(measurements)
  const outputs = calculateWaste(inputs, config, trade)

  return outputs.map((output, index) => {
    const item: BidLineItem = {
      price_list_id: null,
      section: output.section,
      description: output.description,
      qty: output.qty,
      unit: output.unit,
      unit_price: 0,
      margin_pct: defaultMarginPct,
      total_price: 0,
      total_margin: 0,
      line_total: 0,
      is_taxable: output.section === 'materials',
      sort_order: index,
      notes: null,
      qty_source: 'formula',
      qty_formula: output.formula,
    }
    return calculateLineItemTotals(item)
  })
}
