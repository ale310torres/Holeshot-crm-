-- Holeshot CRM - Fase 3
-- Ejecuta este archivo una sola vez en Supabase SQL Editor despues de tener schema.sql.
-- Refuerza multi-cliente, roles, reps y permisos por organization_id.

alter table public.organizations enable row level security;
alter table public.crm_user_profiles enable row level security;
alter table public.sales_reps enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.follow_up_tasks enable row level security;

create or replace function public.crm_current_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
  from public.crm_user_profiles
  where user_id = auth.uid()
    and active = true
  limit 1;
$$;

create or replace function public.crm_current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.crm_user_profiles
  where user_id = auth.uid()
    and active = true
  limit 1;
$$;

create or replace function public.crm_current_sales_rep_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select sales_rep_id
  from public.crm_user_profiles
  where user_id = auth.uid()
    and active = true
  limit 1;
$$;

-- Organizations
drop policy if exists "organizations_admin_update" on public.organizations;
create policy "organizations_admin_update"
on public.organizations for update
to authenticated
using (
  id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin')
)
with check (
  id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin')
);

-- Leads
drop policy if exists "leads_select_by_role" on public.leads;
drop policy if exists "leads_insert_own_org" on public.leads;
drop policy if exists "leads_update_by_role" on public.leads;

create policy "leads_select_by_role"
on public.leads for select
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
  )
);

create policy "leads_insert_by_role"
on public.leads for insert
to authenticated
with check (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
  )
);

create policy "leads_update_by_role"
on public.leads for update
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
  )
)
with check (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
  )
);

-- Tasks
drop policy if exists "tasks_manage_own_org" on public.follow_up_tasks;
drop policy if exists "tasks_manage_by_role" on public.follow_up_tasks;

create policy "tasks_manage_by_role"
on public.follow_up_tasks for all
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
  )
)
with check (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
  )
);

-- Activities
drop policy if exists "activities_select_own_org" on public.lead_activities;
drop policy if exists "activities_select_by_role" on public.lead_activities;

create policy "activities_select_by_role"
on public.lead_activities for select
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or exists (
      select 1
      from public.leads
      where leads.id = lead_activities.lead_id
        and leads.organization_id = public.crm_current_organization_id()
        and leads.assigned_rep_id = public.crm_current_sales_rep_id()
    )
  )
);

-- Helpful indexes for Fase 3 filters.
create index if not exists idx_tasks_assigned_rep on public.follow_up_tasks(assigned_rep_id);
create index if not exists idx_activities_lead_id on public.lead_activities(lead_id);

