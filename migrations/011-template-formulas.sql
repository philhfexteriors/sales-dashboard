-- ============================================================
-- Migration 011: Template Formula System
-- Enables admin-configurable formulas on bid templates
-- that reference Hover measurement variables.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Add default waste % to bid_templates
ALTER TABLE bid_templates
  ADD COLUMN IF NOT EXISTS waste_pct decimal(5,2) NOT NULL DEFAULT 10.00;

-- 2. Add measurement_key and dependency reference to bid_template_items
--    (default_qty_formula and default_qty columns already exist)
ALTER TABLE bid_template_items
  ADD COLUMN IF NOT EXISTS measurement_key text;

ALTER TABLE bid_template_items
  ADD COLUMN IF NOT EXISTS depends_on_item_id uuid
    REFERENCES bid_template_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bid_template_items_depends
  ON bid_template_items(depends_on_item_id);

-- 3. Add template_item_id to bid_line_items for traceability
ALTER TABLE bid_line_items
  ADD COLUMN IF NOT EXISTS template_item_id uuid
    REFERENCES bid_template_items(id) ON DELETE SET NULL;
