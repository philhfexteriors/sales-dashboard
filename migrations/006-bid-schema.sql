-- ============================================================
-- Migration 006: Bid Preparation Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Price List (maintained catalog of material/labor costs)
-- ============================================================
create table price_list (
  id uuid primary key default uuid_generate_v4(),
  trade text not null check (trade in ('roof', 'siding', 'gutters', 'windows', 'fascia_soffit', 'general')),
  section text not null check (section in ('materials', 'labor')),
  item_code text not null,
  description text not null,
  unit text not null check (unit in ('EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR')),
  unit_price decimal(10,2) not null default 0,
  is_taxable boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_price_list_code on price_list(item_code) where active = true;
create index idx_price_list_trade on price_list(trade, section);

alter table price_list enable row level security;

create policy "Authenticated users can read price list"
  on price_list for select to authenticated using (true);

create policy "Admins can manage price list"
  on price_list for all to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

-- ============================================================
-- 2. Price List History (audit trail for price changes)
-- ============================================================
create table price_list_history (
  id uuid primary key default uuid_generate_v4(),
  price_list_id uuid not null references price_list(id) on delete cascade,
  old_unit_price decimal(10,2) not null,
  new_unit_price decimal(10,2) not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  reason text
);

create index idx_price_list_history_item on price_list_history(price_list_id);

alter table price_list_history enable row level security;

create policy "Authenticated users can read price history"
  on price_list_history for select to authenticated using (true);

create policy "Admins can insert price history"
  on price_list_history for insert to authenticated
  with check (is_admin_or_manager());

-- ============================================================
-- 3. Bid Templates (per-trade standard line item sets)
-- ============================================================
create table bid_templates (
  id uuid primary key default uuid_generate_v4(),
  trade text not null check (trade in ('roof', 'siding', 'gutters', 'windows', 'fascia_soffit')),
  name text not null,
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table bid_templates enable row level security;

create policy "Authenticated users can read bid templates"
  on bid_templates for select to authenticated using (true);

create policy "Admins can manage bid templates"
  on bid_templates for all to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

-- ============================================================
-- 4. Bid Template Items (standard line items within a template)
-- ============================================================
create table bid_template_items (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references bid_templates(id) on delete cascade,
  price_list_id uuid references price_list(id) on delete set null,
  section text not null check (section in ('materials', 'labor')),
  description text not null,
  unit text not null check (unit in ('EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR')),
  default_qty_formula text,
  default_qty decimal(10,2),
  sort_order int not null default 0,
  is_required boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_bid_template_items_template on bid_template_items(template_id);

alter table bid_template_items enable row level security;

create policy "Authenticated users can read template items"
  on bid_template_items for select to authenticated using (true);

create policy "Admins can manage template items"
  on bid_template_items for all to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

-- ============================================================
-- 5. Bids (main bid record)
-- ============================================================
create table bids (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references auth.users(id),

  -- CC Integration
  cc_account_id int,
  cc_project_id int,

  -- Hover Integration
  hover_job_id int,
  hover_model_id int,
  hover_address text,

  -- Client info (denormalized from CC for display)
  client_name text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_phone text,
  client_email text,

  -- Bid metadata
  trade text not null check (trade in ('roof', 'siding', 'gutters', 'windows', 'fascia_soffit')),
  template_id uuid references bid_templates(id),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- Margin
  default_margin_pct decimal(5,2) not null default 30.00,

  -- Bid factors that affect pricing/waste formulas
  pitch text,
  stories int default 1,
  material_type text,
  material_variant text check (material_variant in ('vinyl', 'hardie', 'lp_smartside')),
  labor_difficulty text check (labor_difficulty in ('standard', 'moderate', 'difficult')),

  -- Waste percentages (configurable per bid)
  waste_pct_roof decimal(5,2) not null default 10.00,
  waste_pct_siding decimal(5,2) not null default 30.00,
  waste_pct_fascia decimal(5,2) not null default 15.00,

  -- Hover measurement data (cached for display & recalculation)
  measurements_json jsonb,

  -- Sales tax rate
  tax_rate decimal(5,3) not null default 0.000,

  -- Totals (calculated, stored for queries)
  materials_total decimal(10,2) default 0,
  labor_total decimal(10,2) default 0,
  tax_total decimal(10,2) default 0,
  grand_total decimal(10,2) default 0,
  margin_total decimal(10,2) default 0,

  -- PDF
  pdf_url text,

  -- Linked production plan (when bid is converted)
  production_plan_id uuid references production_plans(id),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bids_created_by on bids(created_by);
create index idx_bids_status on bids(status);
create index idx_bids_cc_account on bids(cc_account_id);

alter table bids enable row level security;

create policy "Users can read own bids"
  on bids for select to authenticated
  using (auth.uid() = created_by);

create policy "Users can insert own bids"
  on bids for insert to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update own bids"
  on bids for update to authenticated
  using (auth.uid() = created_by);

create policy "Users can delete own bids"
  on bids for delete to authenticated
  using (auth.uid() = created_by);

create policy "Admins can read all bids"
  on bids for select to authenticated
  using (is_admin_or_manager());

-- ============================================================
-- 6. Bid Versions (negotiation history)
-- ============================================================
create table bid_versions (
  id uuid primary key default uuid_generate_v4(),
  bid_id uuid not null references bids(id) on delete cascade,
  version_number int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'sent', 'superseded')),

  -- Snapshot of totals at this version
  materials_total decimal(10,2) default 0,
  labor_total decimal(10,2) default 0,
  tax_total decimal(10,2) default 0,
  grand_total decimal(10,2) default 0,
  margin_total decimal(10,2) default 0,
  default_margin_pct decimal(5,2) not null default 30.00,

  notes text,
  created_at timestamptz not null default now(),

  constraint unique_bid_version unique (bid_id, version_number)
);

create index idx_bid_versions_bid on bid_versions(bid_id);

alter table bid_versions enable row level security;

create policy "Users can read own bid versions"
  on bid_versions for select to authenticated
  using (exists (
    select 1 from bids where bids.id = bid_versions.bid_id and bids.created_by = auth.uid()
  ));

create policy "Users can insert own bid versions"
  on bid_versions for insert to authenticated
  with check (exists (
    select 1 from bids where bids.id = bid_versions.bid_id and bids.created_by = auth.uid()
  ));

create policy "Users can update own bid versions"
  on bid_versions for update to authenticated
  using (exists (
    select 1 from bids where bids.id = bid_versions.bid_id and bids.created_by = auth.uid()
  ));

create policy "Admins can read all bid versions"
  on bid_versions for select to authenticated
  using (is_admin_or_manager());

-- ============================================================
-- 7. Bid Line Items (per-version)
-- ============================================================
create table bid_line_items (
  id uuid primary key default uuid_generate_v4(),
  bid_id uuid not null references bids(id) on delete cascade,
  version_id uuid not null references bid_versions(id) on delete cascade,
  price_list_id uuid references price_list(id) on delete set null,

  section text not null check (section in ('materials', 'labor')),
  description text not null,
  qty decimal(10,2) not null default 0,
  unit text not null check (unit in ('EA', 'SQ', 'PC', 'RL', 'BX', 'LF', 'SF', 'HR', 'BD', 'PR')),
  unit_price decimal(10,2) not null default 0,
  margin_pct decimal(5,2) not null default 30.00,

  -- Calculated fields (stored for performance)
  total_price decimal(10,2) not null default 0,
  total_margin decimal(10,2) not null default 0,
  line_total decimal(10,2) not null default 0,

  is_taxable boolean not null default false,
  sort_order int not null default 0,
  notes text,

  -- Formula/source tracking
  qty_source text check (qty_source in ('hover', 'manual', 'formula')),
  qty_formula text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bid_line_items_bid on bid_line_items(bid_id);
create index idx_bid_line_items_version on bid_line_items(version_id);

alter table bid_line_items enable row level security;

create policy "Users can read own bid line items"
  on bid_line_items for select to authenticated
  using (exists (
    select 1 from bids where bids.id = bid_line_items.bid_id and bids.created_by = auth.uid()
  ));

create policy "Users can insert own bid line items"
  on bid_line_items for insert to authenticated
  with check (exists (
    select 1 from bids where bids.id = bid_line_items.bid_id and bids.created_by = auth.uid()
  ));

create policy "Users can update own bid line items"
  on bid_line_items for update to authenticated
  using (exists (
    select 1 from bids where bids.id = bid_line_items.bid_id and bids.created_by = auth.uid()
  ));

create policy "Users can delete own bid line items"
  on bid_line_items for delete to authenticated
  using (exists (
    select 1 from bids where bids.id = bid_line_items.bid_id and bids.created_by = auth.uid()
  ));

create policy "Admins can read all bid line items"
  on bid_line_items for select to authenticated
  using (is_admin_or_manager());

-- ============================================================
-- 8. Auto-update triggers
-- ============================================================
create trigger update_price_list_updated_at
  before update on price_list
  for each row execute function update_updated_at_column();

create trigger update_bid_templates_updated_at
  before update on bid_templates
  for each row execute function update_updated_at_column();

create trigger update_bids_updated_at
  before update on bids
  for each row execute function update_updated_at_column();

create trigger update_bid_line_items_updated_at
  before update on bid_line_items
  for each row execute function update_updated_at_column();
