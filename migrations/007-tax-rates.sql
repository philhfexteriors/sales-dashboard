-- Migration: Tax rates by zip code
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code text NOT NULL,
  state text,
  county text,
  rate numeric(5,4) NOT NULL,  -- e.g., 0.0825 = 8.25%
  description text,             -- e.g., "Travis County, TX"
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(zip_code)
);

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tax rates
CREATE POLICY "Authenticated users can read tax rates"
  ON tax_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins/managers can manage tax rates
CREATE POLICY "Admins can insert tax rates"
  ON tax_rates FOR INSERT
  WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins can update tax rates"
  ON tax_rates FOR UPDATE
  USING (is_admin_or_manager());

CREATE POLICY "Admins can delete tax rates"
  ON tax_rates FOR DELETE
  USING (is_admin_or_manager());
