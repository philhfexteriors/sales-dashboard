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

  -- For 'direct': pipe-separated JSON path fallbacks (e.g., 'roof.area.total|roof.total_area')
  hover_json_paths text,

  -- For 'computed': identifier for a built-in computation function
  computation_id text,

  -- For 'derived': formula referencing other target_field names (e.g., '{openingsPerimeter} / 4')
  derived_formula text,

  -- Default/fallback value when Hover data is missing
  default_value decimal(10,4) NOT NULL DEFAULT 0,

  -- UI grouping on the Hover source side: 'roof', 'facades', 'openings', 'none'
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
-- Seed with current hardcoded mappings
-- ============================================================

-- Roof mappings
INSERT INTO hover_measurement_mappings
  (target_field, target_label, target_unit, trade_group, mapping_type, hover_json_paths, hover_source_category, hover_source_description, sort_order)
VALUES
  ('area', 'Roof Area', 'sq ft', 'roof', 'direct',
   'roof.area.total|roof.area.facets_total|roof.total_area',
   'roof', 'Total roof area', 0),
  ('ridges', 'Ridges', 'LF', 'roof', 'direct',
   'roof.measurements.ridges|roof.ridges|roof.ridge_length',
   'roof', 'Ridge length', 1),
  ('hips', 'Hips', 'LF', 'roof', 'direct',
   'roof.measurements.hips|roof.hips|roof.hip_length',
   'roof', 'Hip length', 2),
  ('valleys', 'Valleys', 'LF', 'roof', 'direct',
   'roof.measurements.valleys|roof.valleys|roof.valley_length',
   'roof', 'Valley length', 3),
  ('rakes', 'Rakes', 'LF', 'roof', 'direct',
   'roof.measurements.rakes|roof.rakes|roof.rake_length',
   'roof', 'Rake length', 4),
  ('eaves', 'Eaves', 'LF', 'roof', 'direct',
   'roof.measurements.eaves|roof.measurements.gutters_eaves|roof.eaves|roof.gutters_eaves|roof.eave_length',
   'roof', 'Eave / gutter run length', 5),
  ('flashing', 'Flashing', 'LF', 'roof', 'direct',
   'roof.measurements.flashing',
   'roof', 'Flashing length', 6),
  ('stepFlashing', 'Step Flashing', 'LF', 'roof', 'direct',
   'roof.measurements.step_flashing',
   'roof', 'Step flashing length', 7),
  ('ridgeVentLength', 'Ridge Vent Length', 'LF', 'roof', 'manual',
   NULL,
   'none', 'Manual entry only', 8);

-- Siding mappings
INSERT INTO hover_measurement_mappings
  (target_field, target_label, target_unit, trade_group, mapping_type, hover_json_paths, computation_id, derived_formula, hover_source_category, hover_source_description, sort_order)
VALUES
  ('sidingArea', 'Siding Area', 'sq ft', 'siding', 'computed',
   NULL, 'sum_facade_areas', NULL,
   'facades', 'Sum of all facade areas', 0),
  ('outsideCorners', 'Outside Corners', 'count', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry — requires 3D model', 1),
  ('insideCorners', 'Inside Corners', 'count', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry — requires 3D model', 2),
  ('openingsPerimeter', 'Openings Perimeter', 'LF', 'siding', 'computed',
   NULL, 'calc_openings_perimeter', NULL,
   'openings', 'Calculated from window/door dimensions', 3),
  ('slopedTrim', 'Sloped Trim', 'LF', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 4),
  ('verticalTrim', 'Vertical Trim', 'LF', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 5),
  ('levelFrieze', 'Level Frieze', 'LF', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 6),
  ('slopedFrieze', 'Sloped Frieze', 'LF', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 7),
  ('levelStarter', 'Level Starter', 'LF', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 8),
  ('openingsSills', 'Openings Sills', 'LF', 'siding', 'derived',
   NULL, NULL, '{openingsPerimeter} / 4',
   'openings', 'Estimated as openingsPerimeter / 4', 9),
  ('soffitSf', 'Soffit SF', 'sq ft', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 10),
  ('gutterDownCount', 'Gutter Down Count', 'count', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 11),
  ('openingsTop', 'Openings Top', 'LF', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Hardie only — manual entry', 12),
  ('blockCount', 'Block Count', 'count', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Hardie only — manual entry', 13),
  ('porchSoffit', 'Porch Soffit', 'sq ft', 'siding', 'manual',
   NULL, NULL, NULL,
   'none', 'Manual entry only', 14);
