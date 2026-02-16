-- Migration 010: Remove item_code requirement
-- Makes item_code nullable (no longer user-facing, auto-generated in API).
-- Drops the unique active index since item_code is no longer meaningful.

-- Drop the unique index on item_code
DROP INDEX IF EXISTS idx_price_list_code;

-- Make item_code nullable
ALTER TABLE price_list ALTER COLUMN item_code DROP NOT NULL;
