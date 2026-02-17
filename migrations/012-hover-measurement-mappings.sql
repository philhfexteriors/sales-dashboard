-- ============================================================
-- Migration 012: Hover Measurement Mappings
-- Makes the Hover→internal field mapping configurable via admin UI.
-- Run this in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS hover_measurement_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Internal measurement field name (e.g., 'area', 'ridges', 'sidingArea')
  target_field text NOT NULL UNIQUE,

  -- Human-readable label
  target_label text NOT NULL,

  -- Unit of measurement
  target_unit text NOT NULL DEFAULT '',

  -- Trade group: 'roof', 'siding', 'gutters', 'fascia_soffit'
  trade_group text NOT NULL,

  -- Mapping type
  mapping_type text NOT NULL CHECK (mapping_type IN ('direct', 'computed', 'derived', 'manual')),

  -- For 'direct': pipe-separated JSON path fallbacks (e.g., 'roof.roof_facets.area|roof.area.total')
  hover_json_paths text,

  -- For 'computed': identifier for a built-in computation function
  computation_id text,

  -- For 'derived': formula referencing other target_field names (e.g., '{openingsPerimeter} / 4')
  derived_formula text,

  -- Default/fallback value when Hover data is missing
  default_value decimal(10,4) NOT NULL DEFAULT 0,

  -- UI grouping on the Hover source side
  hover_source_category text NOT NULL DEFAULT 'none',

  -- Human-readable description of the mapping source
  hover_source_description text,

  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hover_mappings_trade ON hover_measurement_mappings(trade_group);

ALTER TABLE hover_measurement_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read hover mappings"
  ON hover_measurement_mappings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert hover mappings"
  ON hover_measurement_mappings FOR INSERT
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can update hover mappings"
  ON hover_measurement_mappings FOR UPDATE
  USING (is_admin_or_manager());

CREATE POLICY "Admins can delete hover mappings"
  ON hover_measurement_mappings FOR DELETE
  USING (is_admin_or_manager());

-- ============================================================
-- Seed with mappings based on real Hover exported JSON
-- ============================================================

-- Roof mappings
INSERT INTO hover_measurement_mappings
  (target_field, target_label, target_unit, trade_group, mapping_type, hover_json_paths, hover_source_category, hover_source_description, sort_order)
VALUES
  ('area', 'Roof Area', 'sq ft', 'roof', 'direct',
   'roof.roof_facets.area|roof.area.total|roof.area.facets_total|roof.total_area',
   'roof', 'Total roof facet area', 0),
  ('ridges', 'Ridges + Hips', 'LF', 'roof', 'direct',
   'roof.ridges_hips.length|roof.measurements.ridges|roof.ridges',
   'roof', 'Combined ridges/hips length', 1),
  ('hips', 'Hips', 'LF', 'roof', 'manual',
   NULL,
   'none', 'Manual — Hover combines ridges+hips', 2),
  ('valleys', 'Valleys', 'LF', 'roof', 'direct',
   'roof.valleys.length|roof.measurements.valleys|roof.valleys',
   'roof', 'Valley length', 3),
  ('rakes', 'Rakes', 'LF', 'roof', 'direct',
   'roof.rakes.length|roof.measurements.rakes|roof.rakes',
   'roof', 'Rake length', 4),
  ('eaves', 'Eaves', 'LF', 'roof', 'direct',
   'roof.gutters_eaves.length|roofline.eaves_fascia.length|roof.measurements.gutters_eaves|roof.gutters_eaves',
   'roof', 'Eave / gutter run length', 5),
  ('flashing', 'Flashing', 'LF', 'roof', 'direct',
   'roof.flashing.length|roof.measurements.flashing',
   'roof', 'Flashing length', 6),
  ('stepFlashing', 'Step Flashing', 'LF', 'roof', 'direct',
   'roof.step_flashing.length|roof.measurements.step_flashing',
   'roof', 'Step flashing length', 7),
  ('ridgeVentLength', 'Ridge Vent Length', 'LF', 'roof', 'manual',
   NULL,
   'none', 'Manual entry only', 8);

-- Siding mappings
INSERT INTO hover_measurement_mappings
  (target_field, target_label, target_unit, trade_group, mapping_type, hover_json_paths, computation_id, derived_formula, hover_source_category, hover_source_description, sort_order)
VALUES
  ('sidingArea', 'Siding Area', 'sq ft', 'siding', 'direct',
   'area.facades.siding|area.total.siding', NULL, NULL,
   'area', 'Siding facade area from area summary', 0),
  ('outsideCorners', 'Outside Corners', 'count', 'siding', 'direct',
   'corners.outside_corners_qty.siding', NULL, NULL,
   'corners', 'Outside corner count', 1),
  ('insideCorners', 'Inside Corners', 'count', 'siding', 'direct',
   'corners.inside_corners_qty.siding', NULL, NULL,
   'corners', 'Inside corner count', 2),
  ('openingsPerimeter', 'Openings Perimeter', 'LF', 'siding', 'direct',
   'openings.total_perimeter.siding', NULL, NULL,
   'openings', 'Total opening perimeter (siding)', 3),
  ('slopedTrim', 'Sloped Trim', 'LF', 'siding', 'direct',
   'trim.sloped_trim.siding', NULL, NULL,
   'trim', 'Sloped trim length (siding)', 4),
  ('verticalTrim', 'Vertical Trim', 'LF', 'siding', 'direct',
   'trim.vertical_trim.siding', NULL, NULL,
   'trim', 'Vertical trim length (siding)', 5),
  ('levelFrieze', 'Level Frieze', 'LF', 'siding', 'direct',
   'roofline.level_frieze_board.length', NULL, NULL,
   'roofline', 'Level frieze board length', 6),
  ('slopedFrieze', 'Sloped Frieze', 'LF', 'siding', 'direct',
   'roofline.sloped_frieze_board.length', NULL, NULL,
   'roofline', 'Sloped frieze board length', 7),
  ('levelStarter', 'Level Starter', 'LF', 'siding', 'direct',
   'trim.level_starter.siding', NULL, NULL,
   'trim', 'Level starter course length (siding)', 8),
  ('openingsSills', 'Openings Sills', 'LF', 'siding', 'direct',
   'openings.sills_length.siding', NULL, NULL,
   'openings', 'Opening sills length (siding)', 9),
  ('soffitSf', 'Soffit SF', 'sq ft', 'siding', 'computed',
   NULL, 'sum_soffit_areas', NULL,
   'roofline', 'Sum of level + sloped frieze soffit areas', 10),
  ('gutterDownCount', 'Gutter Down Count', 'count', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 11),
  ('openingsTop', 'Openings Top', 'LF', 'siding', 'direct',
   'openings.tops_length.siding', NULL, NULL,
   'openings', 'Opening tops length (siding)', 12),
  ('blockCount', 'Block Count', 'count', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Hardie only — manual entry', 13),
  ('porchSoffit', 'Porch Soffit', 'sq ft', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 14);
