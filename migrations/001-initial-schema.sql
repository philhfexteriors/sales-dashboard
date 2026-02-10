-- ============================================================
-- Production Plan App - Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. User Profiles (role management)
-- ============================================================
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'salesperson' check (role in ('admin', 'sales_manager', 'salesperson')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on user_profiles for select
  using (auth.uid() = id);

-- Users can update their own display_name only
create policy "Users can update own display_name"
  on user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Allow insert for auth callback (upsert on first login)
create policy "Allow insert own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

-- Admin read/write all (via service role or RPC)
-- We'll handle admin access through API routes with service role

-- ============================================================
-- 2. Product Categories
-- ============================================================
create table product_categories (
  id uuid primary key default uuid_generate_v4(),
  section text not null check (section in ('roof', 'siding', 'guttering', 'windows', 'small_jobs')),
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table product_categories enable row level security;

-- All authenticated users can read active categories
create policy "Authenticated users can read categories"
  on product_categories for select
  to authenticated
  using (true);

-- Insert/update/delete handled through API routes with role checks

-- ============================================================
-- 3. Product Options (hierarchical)
-- ============================================================
create table product_options (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references product_categories(id) on delete cascade,
  parent_id uuid references product_options(id) on delete cascade,
  level int not null default 0,
  name text not null,
  notes text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_product_options_category on product_options(category_id);
create index idx_product_options_parent on product_options(parent_id);

alter table product_options enable row level security;

create policy "Authenticated users can read options"
  on product_options for select
  to authenticated
  using (true);

-- ============================================================
-- 4. Warranty Tiers (linked to shingle lines)
-- ============================================================
create table warranty_tiers (
  id uuid primary key default uuid_generate_v4(),
  shingle_line_id uuid not null references product_options(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_warranty_tiers_shingle on warranty_tiers(shingle_line_id);

alter table warranty_tiers enable row level security;

create policy "Authenticated users can read warranty tiers"
  on warranty_tiers for select
  to authenticated
  using (true);

-- ============================================================
-- 5. Start Date Windows
-- ============================================================
create table start_date_windows (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table start_date_windows enable row level security;

create policy "Authenticated users can read start date windows"
  on start_date_windows for select
  to authenticated
  using (true);

-- ============================================================
-- 6. Payment Note Templates
-- ============================================================
create table payment_note_templates (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table payment_note_templates enable row level security;

create policy "Authenticated users can read payment note templates"
  on payment_note_templates for select
  to authenticated
  using (true);

-- ============================================================
-- 7. Production Plans
-- ============================================================
create table production_plans (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft', 'completed', 'signed', 'sent')),

  -- Sale type (can check both)
  is_retail boolean not null default false,
  is_insurance boolean not null default false,

  -- Client info
  cc_account_id int,
  client_name text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_phone text,
  client_email text,

  -- Selected sections
  has_roof boolean not null default false,
  has_siding boolean not null default false,
  has_guttering boolean not null default false,
  has_windows boolean not null default false,
  has_small_jobs boolean not null default false,

  -- Pricing summary
  sale_price decimal(10,2),
  insurance_proceeds decimal(10,2),
  down_payment decimal(10,2),
  out_of_pocket decimal(10,2),

  -- Signature
  signature_data text,
  signed_at timestamptz,
  signed_by_name text,

  -- Initials
  shingle_initials_data text,

  -- PDF
  pdf_url text,
  sent_at timestamptz,

  -- Metadata
  start_date_window_id uuid references start_date_windows(id),
  payment_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_production_plans_created_by on production_plans(created_by);
create index idx_production_plans_status on production_plans(status);

alter table production_plans enable row level security;

-- Salespeople can CRUD their own plans
create policy "Users can read own plans"
  on production_plans for select
  to authenticated
  using (auth.uid() = created_by);

create policy "Users can insert own plans"
  on production_plans for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update own plans"
  on production_plans for update
  to authenticated
  using (auth.uid() = created_by);

create policy "Users can delete own plans"
  on production_plans for delete
  to authenticated
  using (auth.uid() = created_by);

-- ============================================================
-- 8. Plan Line Items
-- ============================================================
create table plan_line_items (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references production_plans(id) on delete cascade,
  section text not null check (section in ('roof', 'siding', 'guttering', 'windows', 'small_jobs', 'misc')),
  field_key text not null,
  sort_order int not null default 0,

  -- Flexible data storage
  selections jsonb,
  options jsonb,
  description text,
  notes text,

  -- Pricing
  amount decimal(10,2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_plan_line_items_plan on plan_line_items(plan_id);

alter table plan_line_items enable row level security;

-- Line items follow the same ownership as plans
create policy "Users can read own plan line items"
  on plan_line_items for select
  to authenticated
  using (
    exists (
      select 1 from production_plans
      where production_plans.id = plan_line_items.plan_id
        and production_plans.created_by = auth.uid()
    )
  );

create policy "Users can insert own plan line items"
  on plan_line_items for insert
  to authenticated
  with check (
    exists (
      select 1 from production_plans
      where production_plans.id = plan_line_items.plan_id
        and production_plans.created_by = auth.uid()
    )
  );

create policy "Users can update own plan line items"
  on plan_line_items for update
  to authenticated
  using (
    exists (
      select 1 from production_plans
      where production_plans.id = plan_line_items.plan_id
        and production_plans.created_by = auth.uid()
    )
  );

create policy "Users can delete own plan line items"
  on plan_line_items for delete
  to authenticated
  using (
    exists (
      select 1 from production_plans
      where production_plans.id = plan_line_items.plan_id
        and production_plans.created_by = auth.uid()
    )
  );

-- ============================================================
-- 9. Terms & Conditions
-- ============================================================
create table terms_conditions (
  id uuid primary key default uuid_generate_v4(),
  version int not null,
  content text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table terms_conditions enable row level security;

create policy "Authenticated users can read terms"
  on terms_conditions for select
  to authenticated
  using (true);

-- ============================================================
-- 10. Auto-update updated_at trigger
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_product_options_updated_at
  before update on product_options
  for each row execute function update_updated_at_column();

create trigger update_production_plans_updated_at
  before update on production_plans
  for each row execute function update_updated_at_column();

create trigger update_plan_line_items_updated_at
  before update on plan_line_items
  for each row execute function update_updated_at_column();

-- ============================================================
-- 11. Admin/Manager access policies
-- These use a helper function to check roles
-- ============================================================
create or replace function is_admin_or_manager()
returns boolean as $$
begin
  return exists (
    select 1 from user_profiles
    where id = auth.uid()
      and role in ('admin', 'sales_manager')
  );
end;
$$ language plpgsql security definer;

-- Admins/managers can read all plans
create policy "Admins can read all plans"
  on production_plans for select
  to authenticated
  using (is_admin_or_manager());

-- Admins/managers can manage product catalog
create policy "Admins can manage categories"
  on product_categories for all
  to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

create policy "Admins can manage options"
  on product_options for all
  to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

create policy "Admins can manage warranty tiers"
  on warranty_tiers for all
  to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

create policy "Admins can manage start date windows"
  on start_date_windows for all
  to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

create policy "Admins can manage payment note templates"
  on payment_note_templates for all
  to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

create policy "Admins can manage terms"
  on terms_conditions for all
  to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());

-- Admins can manage user profiles
create policy "Admins can read all profiles"
  on user_profiles for select
  to authenticated
  using (is_admin_or_manager());

create policy "Admins can update all profiles"
  on user_profiles for update
  to authenticated
  using (is_admin_or_manager());
