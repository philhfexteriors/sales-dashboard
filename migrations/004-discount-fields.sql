-- Add discount fields to production_plans
alter table production_plans add column if not exists discount_value decimal(10,2) default null;
alter table production_plans add column if not exists discount_type text default null;
