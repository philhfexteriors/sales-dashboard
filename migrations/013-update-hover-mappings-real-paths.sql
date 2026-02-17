-- ============================================================
-- Migration 013: Update Hover Measurement Mappings
-- Corrects JSON paths and mapping types based on real Hover
-- exported JSON data. Many fields that were marked 'manual'
-- are actually available directly from Hover.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── Roof: Fix paths to match real Hover JSON structure ──

UPDATE hover_measurement_mappings SET
  hover_json_paths = 'roof.roof_facets.area|roof.area.total|roof.area.facets_total|roof.total_area',
  hover_source_description = 'Total roof facet area'
WHERE target_field = 'area';

UPDATE hover_measurement_mappings SET
  target_label = 'Ridges + Hips',
  hover_json_paths = 'roof.ridges_hips.length|roof.measurements.ridges|roof.ridges',
  hover_source_description = 'Combined ridges/hips length'
WHERE target_field = 'ridges';

UPDATE hover_measurement_mappings SET
  mapping_type = 'manual',
  hover_json_paths = NULL,
  hover_source_category = 'none',
  hover_source_description = 'Manual — Hover combines ridges+hips'
WHERE target_field = 'hips';

UPDATE hover_measurement_mappings SET
  hover_json_paths = 'roof.valleys.length|roof.measurements.valleys|roof.valleys'
WHERE target_field = 'valleys';

UPDATE hover_measurement_mappings SET
  hover_json_paths = 'roof.rakes.length|roof.measurements.rakes|roof.rakes'
WHERE target_field = 'rakes';

UPDATE hover_measurement_mappings SET
  hover_json_paths = 'roof.gutters_eaves.length|roofline.eaves_fascia.length|roof.measurements.gutters_eaves|roof.gutters_eaves'
WHERE target_field = 'eaves';

UPDATE hover_measurement_mappings SET
  hover_json_paths = 'roof.flashing.length|roof.measurements.flashing'
WHERE target_field = 'flashing';

UPDATE hover_measurement_mappings SET
  hover_json_paths = 'roof.step_flashing.length|roof.measurements.step_flashing'
WHERE target_field = 'stepFlashing';

-- ── Siding: Switch from manual/computed to direct with real paths ──

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'area.facades.siding|area.total.siding',
  computation_id = NULL,
  hover_source_category = 'area',
  hover_source_description = 'Siding facade area from area summary'
WHERE target_field = 'sidingArea';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'corners.outside_corners_qty.siding',
  hover_source_category = 'corners',
  hover_source_description = 'Outside corner count'
WHERE target_field = 'outsideCorners';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'corners.inside_corners_qty.siding',
  hover_source_category = 'corners',
  hover_source_description = 'Inside corner count'
WHERE target_field = 'insideCorners';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'openings.total_perimeter.siding',
  computation_id = NULL,
  hover_source_description = 'Total opening perimeter (siding)'
WHERE target_field = 'openingsPerimeter';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'trim.sloped_trim.siding',
  hover_source_category = 'trim',
  hover_source_description = 'Sloped trim length (siding)'
WHERE target_field = 'slopedTrim';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'trim.vertical_trim.siding',
  hover_source_category = 'trim',
  hover_source_description = 'Vertical trim length (siding)'
WHERE target_field = 'verticalTrim';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'roofline.level_frieze_board.length',
  hover_source_category = 'roofline',
  hover_source_description = 'Level frieze board length'
WHERE target_field = 'levelFrieze';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'roofline.sloped_frieze_board.length',
  hover_source_category = 'roofline',
  hover_source_description = 'Sloped frieze board length'
WHERE target_field = 'slopedFrieze';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'trim.level_starter.siding',
  hover_source_category = 'trim',
  hover_source_description = 'Level starter course length (siding)'
WHERE target_field = 'levelStarter';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'openings.sills_length.siding',
  derived_formula = NULL,
  hover_source_category = 'openings',
  hover_source_description = 'Opening sills length (siding)'
WHERE target_field = 'openingsSills';

UPDATE hover_measurement_mappings SET
  mapping_type = 'computed',
  computation_id = 'sum_soffit_areas',
  hover_source_category = 'roofline',
  hover_source_description = 'Sum of level + sloped frieze soffit areas'
WHERE target_field = 'soffitSf';

UPDATE hover_measurement_mappings SET
  mapping_type = 'direct',
  hover_json_paths = 'openings.tops_length.siding',
  hover_source_category = 'openings',
  hover_source_description = 'Opening tops length (siding)'
WHERE target_field = 'openingsTop';
