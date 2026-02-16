-- Migration 009: Configurable product attributes
-- Adds brand column to price_list items and variant_groups config to categories.
-- Run in Supabase SQL Editor.

-- 1. Add brand column to price_list (e.g., "OC", "GAF", "CertainTeed")
ALTER TABLE price_list ADD COLUMN IF NOT EXISTS brand text;

-- 2. Add variant_groups JSONB array to price_list_categories
-- Defines which variant attribute groups items in this category should have.
-- Examples: '["color"]', '["color", "size"]', '[]' (no variants)
-- Default '["color"]' matches existing behavior.
ALTER TABLE price_list_categories ADD COLUMN IF NOT EXISTS variant_groups jsonb DEFAULT '["color"]';
