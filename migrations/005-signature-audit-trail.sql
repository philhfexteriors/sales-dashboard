-- Add audit trail columns for signature verification
alter table production_plans add column if not exists signed_ip text default null;
alter table production_plans add column if not exists signed_user_agent text default null;
