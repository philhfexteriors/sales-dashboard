-- Migration 003: Add salesperson signature, plan date, and price reminder config
-- Run this on Supabase SQL Editor

-- 1. Add salesperson signature and plan date to production_plans
ALTER TABLE production_plans
  ADD COLUMN IF NOT EXISTS salesperson_signature_data text,
  ADD COLUMN IF NOT EXISTS salesperson_name text,
  ADD COLUMN IF NOT EXISTS plan_date date DEFAULT CURRENT_DATE;

-- 2. Add price_reminder config to product_categories
-- Using the existing `config` JSONB column — no schema change needed.
-- Price reminder fields will be stored as:
--   config: { "price_reminder": true, "price_reminder_text": "Don't forget to add pricing for this item!" }
-- This approach keeps the schema flexible and avoids adding more columns.

-- Done! No other schema changes needed.
-- - PDF filename changes are code-only
-- - Down payment default 60% is code-only
-- - PDF $0.00 hiding is code-only
