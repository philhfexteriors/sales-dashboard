-- ============================================================
-- Migration 008: Unified Product Catalog
-- Adds categories and variants to price_list system
-- ============================================================

-- 1. Price List Categories (grouping within a trade)
CREATE TABLE IF NOT EXISTS price_list_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade text NOT NULL CHECK (trade IN ('roof', 'siding', 'gutters', 'windows', 'fascia_soffit', 'general')),
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trade, name)
);

CREATE INDEX IF NOT EXISTS idx_price_list_categories_trade ON price_list_categories(trade);

ALTER TABLE price_list_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price list categories"
  ON price_list_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage price list categories"
  ON price_list_categories FOR ALL TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- Auto-update trigger
CREATE TRIGGER update_price_list_categories_updated_at
  BEFORE UPDATE ON price_list_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Add category_id to price_list
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES price_list_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_price_list_category ON price_list(category_id);

-- 3. Price List Variants (non-price-affecting options like color)
CREATE TABLE IF NOT EXISTS price_list_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES price_list(id) ON DELETE CASCADE,
  name text NOT NULL,
  variant_group text NOT NULL DEFAULT 'color',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_list_variants_item ON price_list_variants(price_list_id);

ALTER TABLE price_list_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price list variants"
  ON price_list_variants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage price list variants"
  ON price_list_variants FOR ALL TO authenticated
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- 4. Add catalog references to plan_line_items
ALTER TABLE plan_line_items ADD COLUMN IF NOT EXISTS price_list_id uuid REFERENCES price_list(id) ON DELETE SET NULL;
ALTER TABLE plan_line_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES price_list_variants(id) ON DELETE SET NULL;
