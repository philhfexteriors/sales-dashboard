import type { WasteCalcInputs } from './measurementMapper'

// ---------- Types ----------

export interface WasteCalcConfig {
  wastePercentRoof: number      // 10, 15, or 20
  wastePercentSiding: number    // 25-30
  wastePercentFascia: number    // 15
  materialVariant: 'vinyl' | 'hardie' | 'lp_smartside'
}

export interface WasteCalcOutput {
  description: string
  qty: number
  unit: string
  section: 'materials' | 'labor'
  formula: string
  qtySource: 'formula'
}

// ---------- Helpers ----------

function roundUp(val: number): number {
  return Math.ceil(val)
}

function wasteFactor(wastePercent: number): number {
  return (wastePercent + 100) / 100
}

function out(description: string, qty: number, unit: string, section: 'materials' | 'labor', formula: string): WasteCalcOutput {
  return { description, qty: Math.max(0, roundUp(qty)), unit, section, formula, qtySource: 'formula' }
}

// ---------- Roofing Materials ----------
// Formulas from Waste Calculator spreadsheet, Waste Calc sheet, cells C3-C17/H4-H19

export function calculateRoofingMaterials(inputs: WasteCalcInputs, config: WasteCalcConfig): WasteCalcOutput[] {
  const w = wasteFactor(config.wastePercentRoof)
  const { area, ridges, hips, valleys, rakes, eaves, flashing, stepFlashing, ridgeVentLength } = inputs

  const items: WasteCalcOutput[] = []

  // Shingles: (area / 100) * waste factor → SQ
  const shinglesSq = (area / 100) * w
  items.push(out('Shingles', shinglesSq, 'SQ', 'materials',
    `(${area} / 100) * ${w.toFixed(2)}`))

  // Standard Starter: (rakes + eaves) / 116 → BD
  if (rakes + eaves > 0) {
    items.push(out('Standard Starter', (rakes + eaves) / 116, 'BD', 'materials',
      `(${rakes} + ${eaves}) / 116`))
  }

  // Standard Ridge Cap: (hips + ridges) * 1.15 / 30 → BD
  if (hips + ridges > 0) {
    items.push(out('Standard Ridge Cap', (hips + ridges) * 1.15 / 30, 'BD', 'materials',
      `(${hips} + ${ridges}) * 1.15 / 30`))
  }

  // Ice & Water Shield: (valleys + eaves) * 1.1 / 67 → RL
  if (valleys + eaves > 0) {
    items.push(out('Ice & Water Shield', (valleys + eaves) * 1.1 / 67, 'RL', 'materials',
      `(${valleys} + ${eaves}) * 1.1 / 67`))
  }

  // Synthetic Felt: area / 1000 → RL
  if (area > 0) {
    items.push(out('Synthetic Felt', area / 1000, 'RL', 'materials',
      `${area} / 1000`))
  }

  // Drip Edge: (rakes + eaves) * 1.15 / 10 → EA
  if (rakes + eaves > 0) {
    items.push(out('Drip Edge', (rakes + eaves) * 1.15 / 10, 'EA', 'materials',
      `(${rakes} + ${eaves}) * 1.15 / 10`))
  }

  // Flashing (L): flashing * 1.1 / 8 → EA
  if (flashing > 0) {
    items.push(out('Flashing (L)', flashing * 1.1 / 8, 'EA', 'materials',
      `${flashing} * 1.1 / 8`))
  }

  // Step Flashing: stepFlashing * 1.05 / 50 → BD
  if (stepFlashing > 0) {
    items.push(out('Step Flashing', stepFlashing * 1.05 / 50, 'BD', 'materials',
      `${stepFlashing} * 1.05 / 50`))
  }

  // Nails/Staples: area / 14 / 100 → BX (coil nails)
  if (area > 0) {
    items.push(out('Coil Nails', roundUp(area / 14) / 100, 'BX', 'materials',
      `ROUNDUP(${area} / 14) / 100`))
  }

  // Ridge Vent: ridgeVentLength / 28 → EA
  if (ridgeVentLength > 0) {
    items.push(out('Ridge Vent', ridgeVentLength / 28, 'EA', 'materials',
      `${ridgeVentLength} / 28`))
  }

  // Steep fee areas per pitch tier
  for (const [pitch, steepArea] of Object.entries(inputs.steepAreas)) {
    if (steepArea > 0) {
      const qty = (steepArea / 100) * w
      items.push(out(`Steep Fee (${pitch})`, qty, 'SQ', 'materials',
        `(${steepArea} / 100) * ${w.toFixed(2)}`))
    }
  }

  return items
}

// ---------- Roofing Labor ----------

export function calculateRoofingLabor(
  inputs: WasteCalcInputs,
  config: WasteCalcConfig,
  materialQtys: Record<string, number>
): WasteCalcOutput[] {
  const { valleys, eaves, rakes, ridgeVentLength } = inputs
  const items: WasteCalcOutput[] = []

  // Tear off & Install: shingles_qty + starter_qty/3 + ridge_qty/3
  const shinglesQty = materialQtys['Shingles'] || 0
  const starterQty = materialQtys['Standard Starter'] || 0
  const ridgeQty = materialQtys['Standard Ridge Cap'] || 0
  if (shinglesQty > 0) {
    items.push(out('Tear Off & Install Shingles',
      shinglesQty + starterQty / 3 + ridgeQty / 3, 'SQ', 'labor',
      `${shinglesQty} + ${starterQty}/3 + ${ridgeQty}/3`))
  }

  // Install I&W Shield: valleys + eaves
  if (valleys + eaves > 0) {
    items.push(out('Install I&W Shield', valleys + eaves, 'LF', 'labor',
      `${valleys} + ${eaves}`))
  }

  // Install Drip Edge: rakes + eaves
  if (rakes + eaves > 0) {
    items.push(out('Install Drip Edge', rakes + eaves, 'LF', 'labor',
      `${rakes} + ${eaves}`))
  }

  // Install Ridge Vent
  if (ridgeVentLength > 0) {
    items.push(out('Install Ridge Vent', ridgeVentLength, 'LF', 'labor',
      `${ridgeVentLength}`))
  }

  // Steep fee labor per tier
  for (const [pitch, steepArea] of Object.entries(inputs.steepAreas)) {
    if (steepArea > 0) {
      const w = wasteFactor(config.wastePercentRoof)
      items.push(out(`Steep Fee Labor (${pitch})`, (steepArea / 100) * w, 'SQ', 'labor',
        `(${steepArea} / 100) * ${w.toFixed(2)}`))
    }
  }

  return items
}

// ---------- Siding Materials ----------
// Formulas from spreadsheet cells K3-K17/O4

export function calculateSidingMaterials(inputs: WasteCalcInputs, config: WasteCalcConfig): WasteCalcOutput[] {
  const w = wasteFactor(config.wastePercentSiding)
  const isHardie = config.materialVariant === 'hardie'
  const {
    sidingArea, outsideCorners, insideCorners, openingsPerimeter,
    slopedTrim, verticalTrim, levelFrieze, slopedFrieze,
    levelStarter, openingsSills, soffitSf, openingsTop, blockCount,
  } = inputs

  const items: WasteCalcOutput[] = []
  const sidingSq = (sidingArea / 100) * w

  // Siding: (area / 100) * waste → SQ
  if (sidingArea > 0) {
    items.push(out(isHardie ? 'Hardie Siding' : 'Vinyl Siding', sidingSq, 'SQ', 'materials',
      `(${sidingArea} / 100) * ${w.toFixed(2)}`))
  }

  // Outside Corner Posts: count (vinyl) or count * 2 (Hardie)
  if (outsideCorners > 0) {
    const qty = isHardie ? outsideCorners * 2 : outsideCorners
    items.push(out('Outside Corner Posts', qty, 'EA', 'materials',
      isHardie ? `${outsideCorners} * 2` : `${outsideCorners}`))
  }

  // Inside Corner Posts: count (vinyl) or count * 2 (Hardie)
  if (insideCorners > 0) {
    const qty = isHardie ? insideCorners * 2 : insideCorners
    items.push(out('Inside Corner Posts', qty, 'EA', 'materials',
      isHardie ? `${insideCorners} * 2` : `${insideCorners}`))
  }

  // J-Channel (Openings): (openings_perimeter / 10) * waste
  if (openingsPerimeter > 0) {
    items.push(out('J-Channel (Openings)', (openingsPerimeter / 10) * w, 'EA', 'materials',
      `(${openingsPerimeter} / 10) * ${w.toFixed(2)}`))
  }

  // J-Channel (Trim): SUM(sloped_trim, sloped_frieze) / 10 * waste
  const trimTotal = slopedTrim + slopedFrieze
  if (trimTotal > 0) {
    items.push(out('J-Channel (Trim)', (trimTotal / 10) * w, 'EA', 'materials',
      `(${trimTotal} / 10) * ${w.toFixed(2)}`))
  }

  // Finish Trim: SUM(level_frieze, openings_sills) / 12.5 * waste
  const finishTotal = levelFrieze + openingsSills
  if (finishTotal > 0) {
    items.push(out('Finish Trim', (finishTotal / 12.5) * w, 'EA', 'materials',
      `(${finishTotal} / 12.5) * ${w.toFixed(2)}`))
  }

  // Lineal (Openings): openings_perimeter / 20 * waste
  if (openingsPerimeter > 0) {
    items.push(out('Lineal (Openings)', (openingsPerimeter / 20) * w, 'EA', 'materials',
      `(${openingsPerimeter} / 20) * ${w.toFixed(2)}`))
  }

  // Starter Strip: level_starter / 10 (vinyl) or / 18 (Hardie PVC starter)
  if (levelStarter > 0) {
    const divisor = isHardie ? 18 : 10
    items.push(out(isHardie ? 'PVC Starter Board' : 'Starter Strip', levelStarter / divisor, 'EA', 'materials',
      `${levelStarter} / ${divisor}`))
  }

  // Trim Coil: vertical_trim / 150 * waste (vinyl) or SUM(sloped,vertical,openingsTop)/150 * waste (Hardie)
  if (isHardie) {
    const hardieCoilTotal = slopedTrim + verticalTrim + openingsTop
    if (hardieCoilTotal > 0) {
      items.push(out('Coil for Z-Flashing', (hardieCoilTotal / 150) * w, 'EA', 'materials',
        `(${hardieCoilTotal} / 150) * ${w.toFixed(2)}`))
    }
  } else if (verticalTrim > 0) {
    items.push(out('Trim Coil', (verticalTrim / 150) * w, 'EA', 'materials',
      `(${verticalTrim} / 150) * ${w.toFixed(2)}`))
  }

  // Siding Nails: siding_sq / 5
  if (sidingSq > 0) {
    items.push(out('Siding Nails', roundUp(sidingSq) / 5, 'RL', 'materials',
      `${roundUp(sidingSq)} / 5`))
  }

  // OSA Quad Sealant: siding_sq / 3
  if (sidingSq > 0) {
    items.push(out('OSA Quad Sealant', roundUp(sidingSq) / 3, 'EA', 'materials',
      `${roundUp(sidingSq)} / 3`))
  }

  // Housewrap: siding_sq / 9
  if (sidingSq > 0) {
    items.push(out('Housewrap', roundUp(sidingSq) / 9, 'RL', 'materials',
      `${roundUp(sidingSq)} / 9`))
  }

  // Hardie-specific extras
  if (isHardie) {
    // 8" Trim for Blocks: (block_count * 2) / 12
    if (blockCount > 0) {
      items.push(out('8" Trim for Blocks', (blockCount * 2) / 12, 'EA', 'materials',
        `(${blockCount} * 2) / 12`))
    }

    // Touch Up Paint: 1 per 10 SQ
    if (sidingSq > 0) {
      items.push(out('Touch Up Paint', roundUp(sidingSq) / 10, 'EA', 'materials',
        `${roundUp(sidingSq)} / 10`))
    }

    // Adfast Caulk: siding_sq / 3
    if (sidingSq > 0) {
      items.push(out('Adfast Caulk', roundUp(sidingSq) / 3, 'EA', 'materials',
        `${roundUp(sidingSq)} / 3`))
    }
  }

  return items
}

// ---------- Siding Labor ----------

export function calculateSidingLabor(
  inputs: WasteCalcInputs,
  config: WasteCalcConfig,
  materialQtys: Record<string, number>
): WasteCalcOutput[] {
  const w = wasteFactor(config.wastePercentSiding)
  const sidingSq = (inputs.sidingArea / 100) * w
  const items: WasteCalcOutput[] = []

  // Install SQ
  if (sidingSq > 0) {
    items.push(out('Install Siding', roundUp(sidingSq), 'SQ', 'labor',
      `ROUNDUP(${sidingSq.toFixed(2)})`))
  }

  // Remove SQ (same as install)
  if (sidingSq > 0) {
    items.push(out('Remove Siding', roundUp(sidingSq), 'SQ', 'labor',
      `ROUNDUP(${sidingSq.toFixed(2)})`))
  }

  // Lineal Install: lineal_ea * 20 LF
  const linealEa = materialQtys['Lineal (Openings)'] || 0
  if (linealEa > 0) {
    items.push(out('Lineal Install', linealEa * 20, 'LF', 'labor',
      `${linealEa} * 20`))
  }

  // Custom Flashing: trim_coil_ea * 150 LF
  const trimCoilKey = config.materialVariant === 'hardie' ? 'Coil for Z-Flashing' : 'Trim Coil'
  const trimCoilEa = materialQtys[trimCoilKey] || 0
  if (trimCoilEa > 0) {
    items.push(out('Custom Flashing', trimCoilEa * 150, 'LF', 'labor',
      `${trimCoilEa} * 150`))
  }

  return items
}

// ---------- Fascia/Soffit Materials ----------
// Formulas from spreadsheet cells O39 (waste%)

export function calculateFasciaSoffitMaterials(inputs: WasteCalcInputs, config: WasteCalcConfig): WasteCalcOutput[] {
  const w = wasteFactor(config.wastePercentFascia)
  const { rakes, eaves, soffitSf, porchSoffit } = inputs
  const items: WasteCalcOutput[] = []

  // Fascia 6" Pre-Bent (Rakes): (rakes / 12) * waste
  if (rakes > 0) {
    items.push(out('Fascia 6" Pre-Bent (Rakes)', (rakes / 12) * w, 'EA', 'materials',
      `(${rakes} / 12) * ${w.toFixed(2)}`))
  }

  // Fascia 6" Pre-Bent (Eaves): (eaves / 12) * waste
  if (eaves > 0) {
    items.push(out('Fascia 6" Pre-Bent (Eaves)', (eaves / 12) * w, 'EA', 'materials',
      `(${eaves} / 12) * ${w.toFixed(2)}`))
  }

  // Trim Coil (Custom Fascia): (rakes + eaves) * waste / 100
  if (rakes + eaves > 0) {
    items.push(out('Trim Coil (Custom Fascia)', (rakes + eaves) * w / 100, 'RL', 'materials',
      `(${rakes} + ${eaves}) * ${w.toFixed(2)} / 100`))
  }

  // Aluminum Soffit Q4: waste * soffit_sf / 16
  if (soffitSf > 0) {
    items.push(out('Aluminum Soffit Q4', w * soffitSf / 16, 'PC', 'materials',
      `${w.toFixed(2)} * ${soffitSf} / 16`))
  }

  // Porch Soffit: waste * porch_soffit / 16
  if (porchSoffit > 0) {
    items.push(out('Porch Soffit', w * porchSoffit / 16, 'PC', 'materials',
      `${w.toFixed(2)} * ${porchSoffit} / 16`))
  }

  // F-Channel: (rakes + eaves) * 1.05 / 12
  if (rakes + eaves > 0) {
    items.push(out('F-Channel', (rakes + eaves) * 1.05 / 12, 'EA', 'materials',
      `(${rakes} + ${eaves}) * 1.05 / 12`))
  }

  // Trim Nails: waste * (rakes + eaves) / 300
  if (rakes + eaves > 0) {
    items.push(out('Trim Nails', w * (rakes + eaves) / 300, 'BX', 'materials',
      `${w.toFixed(2)} * (${rakes} + ${eaves}) / 300`))
  }

  // Sealant: same formula as nails
  if (rakes + eaves > 0) {
    items.push(out('Sealant', w * (rakes + eaves) / 300, 'EA', 'materials',
      `${w.toFixed(2)} * (${rakes} + ${eaves}) / 300`))
  }

  return items
}

// ---------- Guttering Materials ----------

export function calculateGutteringMaterials(inputs: WasteCalcInputs, _config: WasteCalcConfig): WasteCalcOutput[] {
  const { eaves, gutterDownCount } = inputs
  const items: WasteCalcOutput[] = []

  // Gutter Length: eaves * 1.05
  const gutterLength = eaves * 1.05
  if (eaves > 0) {
    items.push(out('Gutter Length', gutterLength, 'LF', 'materials',
      `${eaves} * 1.05`))
  }

  // Gutter Downs: gutter_down_count * 15
  if (gutterDownCount > 0) {
    items.push(out('Gutter Downs', gutterDownCount * 15, 'LF', 'materials',
      `${gutterDownCount} * 15`))
  }

  // Gutter Guards: = gutter_length
  if (gutterLength > 0) {
    items.push(out('Gutter Guards', gutterLength, 'LF', 'materials',
      `= gutter_length (${gutterLength.toFixed(0)})`))
  }

  return items
}

// ---------- Dispatcher ----------

export function calculateWaste(inputs: WasteCalcInputs, config: WasteCalcConfig, trade: string): WasteCalcOutput[] {
  switch (trade) {
    case 'roof': {
      const mats = calculateRoofingMaterials(inputs, config)
      const matQtys = Object.fromEntries(mats.map(m => [m.description, m.qty]))
      return [...mats, ...calculateRoofingLabor(inputs, config, matQtys)]
    }
    case 'siding': {
      const mats = calculateSidingMaterials(inputs, config)
      const matQtys = Object.fromEntries(mats.map(m => [m.description, m.qty]))
      return [...mats, ...calculateSidingLabor(inputs, config, matQtys)]
    }
    case 'fascia_soffit':
      return calculateFasciaSoffitMaterials(inputs, config)
    case 'gutters':
      return calculateGutteringMaterials(inputs, config)
    default:
      return []
  }
}
