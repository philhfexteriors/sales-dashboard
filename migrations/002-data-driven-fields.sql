-- Migration 002: Data-Driven Forms
-- Makes all production plan fields admin-configurable via product_categories

-- ============================================================
-- 1. Add new columns to product_categories
-- ============================================================

ALTER TABLE product_categories
  ADD COLUMN IF NOT EXISTS field_key text,
  ADD COLUMN IF NOT EXISTS field_type text NOT NULL DEFAULT 'select',
  ADD COLUMN IF NOT EXISTS cascade_levels int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS level_labels jsonb,
  ADD COLUMN IF NOT EXISTS allow_custom boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_deselect boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS config jsonb;

-- ============================================================
-- 2. Update existing categories with field_key + field_type
-- ============================================================

-- Roof: Shingles (already exists)
UPDATE product_categories SET
  field_key = 'shingles',
  field_type = 'cascade',
  cascade_levels = 3,
  level_labels = '["Brand", "Line", "Color"]'::jsonb
WHERE section = 'roof' AND LOWER(name) = 'shingles';

-- Roof: Ventilation (already exists)
UPDATE product_categories SET
  field_key = 'ventilation',
  field_type = 'select',
  cascade_levels = 1,
  level_labels = '["Type"]'::jsonb,
  allow_custom = true
WHERE section = 'roof' AND LOWER(name) = 'ventilation';

-- Roof: Pipe Boots (already exists)
UPDATE product_categories SET
  field_key = 'pipe_boots',
  field_type = 'select',
  cascade_levels = 1,
  level_labels = '["Type"]'::jsonb,
  allow_custom = true
WHERE section = 'roof' AND LOWER(name) = 'pipe boots';

-- Roof: Drip Edge (already exists)
UPDATE product_categories SET
  field_key = 'drip_edge',
  field_type = 'select',
  cascade_levels = 1,
  level_labels = '["Type"]'::jsonb,
  allow_custom = true
WHERE section = 'roof' AND LOWER(name) = 'drip edge';

-- Roof: Ice & Water (already exists)
UPDATE product_categories SET
  field_key = 'ice_water',
  field_type = 'checkbox',
  cascade_levels = 1,
  level_labels = '["Type"]'::jsonb,
  config = '{"sub_fields": [{"key": "product", "type": "select", "label": "Product"}]}'::jsonb
WHERE section = 'roof' AND LOWER(name) = 'ice & water';

-- Roof: Skylights (already exists)
UPDATE product_categories SET
  field_key = 'skylights',
  field_type = 'count',
  cascade_levels = 2,
  level_labels = '["Brand", "Model"]'::jsonb,
  config = '{"sub_fields": [{"key": "product", "type": "cascade", "label": "Brand/Model", "show_when": {"count": ">0"}}, {"key": "action", "type": "radio", "label": "Action", "show_when": {"count": ">0"}}]}'::jsonb
WHERE section = 'roof' AND LOWER(name) = 'skylights';

-- Siding: Siding (already exists)
UPDATE product_categories SET
  field_key = 'siding_specs',
  field_type = 'cascade',
  cascade_levels = 3,
  level_labels = '["Brand", "Line", "Color"]'::jsonb
WHERE section = 'siding' AND LOWER(name) = 'siding';

-- Siding: Fascia (already exists)
UPDATE product_categories SET
  field_key = 'fascia',
  field_type = 'cascade',
  cascade_levels = 3,
  level_labels = '["Brand", "Color", "Size"]'::jsonb
WHERE section = 'siding' AND LOWER(name) = 'fascia';

-- Siding: Soffit (already exists)
UPDATE product_categories SET
  field_key = 'soffit',
  field_type = 'cascade',
  cascade_levels = 3,
  level_labels = '["Brand", "Color", "Type"]'::jsonb
WHERE section = 'siding' AND LOWER(name) = 'soffit';

-- ============================================================
-- 3. Insert NEW categories for fields that were hardcoded
-- ============================================================

-- Helper: get max sort_order for a section
-- We'll use explicit sort_order values

-- ROOF section new categories
INSERT INTO product_categories (section, name, field_key, field_type, cascade_levels, level_labels, allow_custom, allow_deselect, config, sort_order, active)
VALUES
  ('roof', 'Load', 'load', 'radio', 1, '["Type"]'::jsonb, false, false, null, 1, true),
  ('roof', 'Existing Layers', 'ext_layers', 'select', 1, '["Layers"]'::jsonb, false, false,
    '{"sub_fields": [{"key": "total_sq", "type": "number", "label": "Total Sq Ft"}]}'::jsonb, 2, true),
  ('roof', 'Chimney Flashing', 'chimney_flashing', 'checkbox', 1, '["Type"]'::jsonb, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color", "show_when": {"has_selection": true}}]}'::jsonb, 6, true),
  ('roof', 'Roof to Wall Flashing', 'roof_wall_flashing', 'checkbox', 1, '["Type"]'::jsonb, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color", "show_when": {"has_selection": true}}]}'::jsonb, 7, true),
  ('roof', 'Warranty', 'warranty', 'select', 1, '["Tier"]'::jsonb, false, false,
    '{"linked_to": "shingle_line"}'::jsonb, 10, true),
  ('roof', 'Satellite', 'satellite', 'radio', 1, '["Action"]'::jsonb, false, true, null, 11, true),
  ('roof', 'Starter Strip', 'starter_strip', 'select', 1, '["Type"]'::jsonb, true, false, null, 13, true)
ON CONFLICT DO NOTHING;

-- Update sort_order for existing roof categories
UPDATE product_categories SET sort_order = 0 WHERE section = 'roof' AND field_key = 'shingles';
UPDATE product_categories SET sort_order = 3 WHERE section = 'roof' AND field_key = 'ice_water';
UPDATE product_categories SET sort_order = 4 WHERE section = 'roof' AND field_key = 'skylights';
UPDATE product_categories SET sort_order = 8 WHERE section = 'roof' AND field_key = 'ventilation';
UPDATE product_categories SET sort_order = 9 WHERE section = 'roof' AND field_key = 'pipe_boots';
UPDATE product_categories SET sort_order = 12 WHERE section = 'roof' AND field_key = 'drip_edge';

-- SIDING section new categories
INSERT INTO product_categories (section, name, field_key, field_type, cascade_levels, level_labels, allow_custom, allow_deselect, config, sort_order, active)
VALUES
  ('siding', 'Corners - Inner', 'corners_inner', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}]}'::jsonb, 1, true),
  ('siding', 'Corners - Outer', 'corners_outer', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}]}'::jsonb, 2, true),
  ('siding', 'Corners - Bay', 'corners_bay', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}]}'::jsonb, 3, true),
  ('siding', 'J-Channel', 'j_channel', 'text', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}]}'::jsonb, 4, true),
  ('siding', 'Underlay', 'underlay', 'checkbox', 1, '["Type"]'::jsonb, false, false, null, 5, true),
  ('siding', 'Split Blocks', 'split_blocks', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}], "match_from": "siding_specs.color"}'::jsonb, 6, true),
  ('siding', 'Light Blocks', 'light_blocks', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}], "match_from": "siding_specs.color"}'::jsonb, 7, true),
  ('siding', 'Exhaust', 'exhaust', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}], "match_from": "siding_specs.color"}'::jsonb, 8, true),
  ('siding', 'Gable Vents', 'gable_vents', 'count', 1, null, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}, {"key": "shape", "type": "text", "label": "Shape"}, {"key": "size", "type": "text", "label": "Size"}]}'::jsonb, 9, true)
ON CONFLICT DO NOTHING;

-- Update sort_order for existing siding categories
UPDATE product_categories SET sort_order = 0 WHERE section = 'siding' AND field_key = 'siding_specs';
UPDATE product_categories SET sort_order = 10 WHERE section = 'siding' AND field_key = 'fascia';
UPDATE product_categories SET sort_order = 11 WHERE section = 'siding' AND field_key = 'soffit';

-- GUTTERING section new categories
INSERT INTO product_categories (section, name, field_key, field_type, cascade_levels, level_labels, allow_custom, allow_deselect, config, sort_order, active)
VALUES
  ('guttering', 'Gutters', 'gutters', 'radio', 1, '["Size"]'::jsonb, false, false,
    '{"sub_fields": [{"key": "color", "type": "text", "label": "Color"}]}'::jsonb, 0, true),
  ('guttering', 'Gutter Guards', 'guards', 'text', 1, null, false, false, null, 1, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Insert product_options for previously hardcoded values
-- ============================================================

-- Load options (Roof/Ground)
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Roof', 0), ('Ground', 1)) AS opt(name, sort_order)
WHERE c.field_key = 'load' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Existing Layers options (1, 2, 3)
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('1 Layer', 0), ('2 Layers', 1), ('3 Layers', 2)) AS opt(name, sort_order)
WHERE c.field_key = 'ext_layers' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Ice & Water placement options (Eaves/Valleys)
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Eaves', 0), ('Valleys', 1)) AS opt(name, sort_order)
WHERE c.field_key = 'ice_water' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Skylight action options (Flash/Replace)
INSERT INTO product_options (category_id, parent_id, level, name, notes, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.notes, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Flash', 'sub:action', 0), ('Replace', 'sub:action', 1)) AS opt(name, notes, sort_order)
WHERE c.field_key = 'skylights' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name AND po.notes = 'sub:action'
);

-- Chimney Flashing types
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Siding', 0), ('Brick', 1), ('Custom Cut', 2), ('Groove-in', 3), ('Pre Bent', 4)) AS opt(name, sort_order)
WHERE c.field_key = 'chimney_flashing' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Roof to Wall Flashing types (same options)
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Siding', 0), ('Brick', 1), ('Custom Cut', 2), ('Groove-in', 3), ('Pre Bent', 4)) AS opt(name, sort_order)
WHERE c.field_key = 'roof_wall_flashing' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Satellite options (Remove/Reset)
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Remove', 0), ('Reset', 1)) AS opt(name, sort_order)
WHERE c.field_key = 'satellite' AND c.section = 'roof'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Underlay options (Wrap/Fanfold)
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('Wrap', 0), ('Fanfold', 1)) AS opt(name, sort_order)
WHERE c.field_key = 'underlay' AND c.section = 'siding'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);

-- Gutter size options
INSERT INTO product_options (category_id, parent_id, level, name, sort_order, active)
SELECT c.id, null, 0, opt.name, opt.sort_order, true
FROM product_categories c,
     (VALUES ('5"', 0), ('6"', 1)) AS opt(name, sort_order)
WHERE c.field_key = 'gutters' AND c.section = 'guttering'
AND NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.category_id = c.id AND po.name = opt.name
);
