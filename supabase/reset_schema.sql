-- Holeshot CRM reset para desarrollo inicial.
-- Usa esto solo si estas empezando y no tienes datos reales que quieras conservar.
-- Primero ejecuta este archivo en Supabase SQL Editor.
-- Luego ejecuta supabase/schema.sql otra vez.

drop table if exists public.automation_logs cascade;
drop table if exists public.follow_up_tasks cascade;
drop table if exists public.lead_activities cascade;
drop table if exists public.leads cascade;
drop table if exists public.crm_user_profiles cascade;
drop table if exists public.sales_reps cascade;
drop table if exists public.organizations cascade;

drop function if exists public.crm_current_organization_id() cascade;
drop function if exists public.crm_current_role() cascade;
drop function if exists public.crm_current_sales_rep_id() cascade;
drop function if exists public.set_updated_at() cascade;

