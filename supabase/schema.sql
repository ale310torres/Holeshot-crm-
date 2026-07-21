-- Holeshot CRM - Supabase schema
-- Negocio: servicio, piezas, motoras y ATV de motocross.
-- Ejecutar completo en Supabase SQL Editor. Es seguro correrlo mas de una vez.

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. Organizacion, equipo y acceso al CRM
-- =========================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  slug text unique not null,
  niche text,
  logo_url text,
  primary_phone text,
  primary_email text,
  website_url text,
  active boolean not null default true,
  business_type text not null default 'motocross_service_parts',
  whatsapp_number text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'Puerto Rico',
  timezone text not null default 'America/Puerto_Rico'
);

alter table public.organizations add column if not exists business_type text not null default 'motocross_service_parts';
alter table public.organizations add column if not exists whatsapp_number text;
alter table public.organizations add column if not exists address_line1 text;
alter table public.organizations add column if not exists city text;
alter table public.organizations add column if not exists state text;
alter table public.organizations add column if not exists postal_code text;
alter table public.organizations add column if not exists country text not null default 'Puerto Rico';
alter table public.organizations add column if not exists timezone text not null default 'America/Puerto_Rico';

create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  initials text,
  phone text,
  email text,
  active boolean not null default true,
  region text,
  department text not null default 'Ventas',
  specialties text[],
  max_daily_leads integer,
  last_assigned_at timestamptz,
  telegram_chat_id text
);

alter table public.sales_reps add column if not exists department text not null default 'Ventas';

create table if not exists public.crm_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_rep_id uuid references public.sales_reps(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'rep' check (role in ('owner', 'admin', 'manager', 'rep')),
  active boolean not null default true,
  unique(user_id)
);

-- =========================================================
-- 2. Clientes y vehiculos
-- =========================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  phone text,
  whatsapp_phone text,
  email text,
  preferred_channel text not null default 'WhatsApp',
  customer_type text not null default 'retail',
  city text,
  address_line1 text,
  notes text,
  tags text[] not null default '{}'::text[],
  last_contact_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vehicle_type text not null default 'motora',
  make text,
  model text,
  year integer,
  engine_cc integer,
  vin text,
  plate text,
  color text,
  use_type text default 'motocross',
  notes text,
  active boolean not null default true
);

-- =========================================================
-- 3. Leads y oportunidades
-- Mantiene compatibilidad con la app actual y agrega campos reales de Holeshot.
-- =========================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.customer_vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  full_name text,
  first_name text,
  last_name text,
  phone text,
  email text,
  source text default 'Manual',
  source_campaign text,
  source_form text,
  fb_lead_id text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  utm_content text,
  -- Campos legacy usados por pantallas anteriores. En Holeshot se muestran como direccion/zona del cliente.
  property_address text,
  property_city text,
  property_zip text,
  property_type text,
  occupied_status text,
  property_condition text,
  selling_timeline text,
  asking_price numeric,
  mortgage_balance numeric,
  seller_motivation text,
  service_interest text,
  budget text,
  timeline text,
  message text,
  interest_type text not null default 'Servicio',
  service_category text,
  requested_service text,
  requested_part text,
  part_number text,
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  engine_cc integer,
  vin text,
  urgency text not null default 'Media',
  preferred_dropoff_at timestamptz,
  appointment_at timestamptz,
  estimate_amount numeric,
  quote_status text not null default 'Sin cotizacion',
  work_order_status text not null default 'Sin orden',
  parts_status text not null default 'No aplica',
  payment_status text not null default 'Pendiente',
  lost_reason text,
  stage text not null default 'Nueva solicitud',
  lead_status text not null default 'open',
  lead_temperature text not null default 'Sin clasificar',
  lead_score integer not null default 0,
  assigned_to text,
  assigned_rep_id uuid references public.sales_reps(id) on delete set null,
  conversation_summary text,
  next_action text,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.leads add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.leads add column if not exists vehicle_id uuid references public.customer_vehicles(id) on delete set null;
alter table public.leads add column if not exists interest_type text not null default 'Servicio';
alter table public.leads add column if not exists service_category text;
alter table public.leads add column if not exists requested_service text;
alter table public.leads add column if not exists requested_part text;
alter table public.leads add column if not exists part_number text;
alter table public.leads add column if not exists vehicle_type text;
alter table public.leads add column if not exists vehicle_make text;
alter table public.leads add column if not exists vehicle_model text;
alter table public.leads add column if not exists vehicle_year integer;
alter table public.leads add column if not exists engine_cc integer;
alter table public.leads add column if not exists vin text;
alter table public.leads add column if not exists urgency text not null default 'Media';
alter table public.leads add column if not exists preferred_dropoff_at timestamptz;
alter table public.leads add column if not exists appointment_at timestamptz;
alter table public.leads add column if not exists estimate_amount numeric;
alter table public.leads add column if not exists quote_status text not null default 'Sin cotizacion';
alter table public.leads add column if not exists work_order_status text not null default 'Sin orden';
alter table public.leads add column if not exists parts_status text not null default 'No aplica';
alter table public.leads add column if not exists payment_status text not null default 'Pendiente';
alter table public.leads add column if not exists lost_reason text;
alter table public.leads alter column stage set default 'Nueva solicitud';

update public.leads
set stage = 'Nueva solicitud'
where stage in ('Nuevo Lead', 'Nuevo lead');

update public.leads
set stage = 'Validando vehiculo'
where stage in ('Cualificando', 'Interesado');

update public.leads
set stage = 'Servicio agendado'
where stage = 'Cita agendada';

update public.leads
set stage = 'Seguimiento'
where stage = 'No contesto';

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  service_order_id uuid,
  quote_id uuid,
  created_at timestamptz not null default now(),
  activity_type text not null,
  activity_title text,
  channel text,
  direction text,
  message text,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.lead_activities alter column lead_id drop not null;
alter table public.lead_activities add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.lead_activities add column if not exists service_order_id uuid;
alter table public.lead_activities add column if not exists quote_id uuid;
alter table public.lead_activities add column if not exists activity_title text;

-- =========================================================
-- 4. Inventario de piezas y catalogo de servicios
-- =========================================================

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text,
  name text not null,
  category text not null default 'Servicio',
  description text,
  labor_hours numeric,
  base_price numeric,
  active boolean not null default true,
  sort_order integer not null default 100
);

create table if not exists public.parts_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sku text,
  part_number text,
  name text not null,
  category text not null default 'Pieza',
  brand text,
  fits_vehicle_type text,
  fits_make text,
  fits_model text,
  stock_qty integer not null default 0,
  reorder_point integer not null default 0,
  cost numeric,
  retail_price numeric,
  supplier text,
  location_bin text,
  status text not null default 'active',
  notes text
);

-- =========================================================
-- 5. Ordenes de servicio
-- =========================================================

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.customer_vehicles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  assigned_rep_id uuid references public.sales_reps(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_number text,
  status text not null default 'draft',
  priority text not null default 'normal',
  opened_at timestamptz not null default now(),
  scheduled_at timestamptz,
  checked_in_at timestamptz,
  promised_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  odometer_hours numeric,
  complaint text,
  diagnosis text,
  work_performed text,
  internal_notes text,
  parts_total numeric not null default 0,
  labor_total numeric not null default 0,
  discount_total numeric not null default 0,
  tax_total numeric not null default 0,
  grand_total numeric not null default 0,
  deposit_amount numeric not null default 0,
  balance_due numeric not null default 0,
  payment_status text not null default 'Pendiente'
);

create table if not exists public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  service_catalog_id uuid references public.service_catalog(id) on delete set null,
  part_id uuid references public.parts_inventory(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  item_type text not null default 'service',
  description text not null,
  sku text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  cost numeric,
  line_total numeric not null default 0,
  notes text
);

-- =========================================================
-- 6. Cotizaciones de piezas/servicio
-- =========================================================

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.customer_vehicles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  assigned_rep_id uuid references public.sales_reps(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  quote_number text,
  status text not null default 'draft',
  valid_until date,
  sent_at timestamptz,
  approved_at timestamptz,
  subtotal numeric not null default 0,
  discount_total numeric not null default 0,
  tax_total numeric not null default 0,
  total numeric not null default 0,
  notes text,
  terms text
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_catalog_id uuid references public.service_catalog(id) on delete set null,
  part_id uuid references public.parts_inventory(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  item_type text not null default 'part',
  description text not null,
  sku text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  cost numeric,
  line_total numeric not null default 0,
  notes text
);

-- =========================================================
-- 7. Tareas, seguimientos y automatizaciones
-- =========================================================

create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  task_type text not null,
  priority text not null default 'normal',
  due_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  assigned_to text,
  assigned_rep_id uuid references public.sales_reps(id) on delete set null,
  notes text,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null
);

alter table public.follow_up_tasks add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.follow_up_tasks add column if not exists service_order_id uuid references public.service_orders(id) on delete set null;
alter table public.follow_up_tasks add column if not exists quote_id uuid references public.quotes(id) on delete set null;
alter table public.follow_up_tasks add column if not exists priority text not null default 'normal';
alter table public.follow_up_tasks add column if not exists completed_by uuid references auth.users(id) on delete set null;

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  workflow_name text,
  execution_id text,
  source text,
  status text not null,
  error_message text,
  payload jsonb not null default '{}'::jsonb
);

alter table public.automation_logs add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.automation_logs add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.automation_logs add column if not exists service_order_id uuid references public.service_orders(id) on delete set null;
alter table public.automation_logs add column if not exists quote_id uuid references public.quotes(id) on delete set null;

-- Late foreign keys for activity links created before quotes/service_orders existed.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lead_activities_service_order_id_fkey'
      and conrelid = 'public.lead_activities'::regclass
  ) then
    alter table public.lead_activities
      add constraint lead_activities_service_order_id_fkey
      foreign key (service_order_id) references public.service_orders(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'lead_activities_quote_id_fkey'
      and conrelid = 'public.lead_activities'::regclass
  ) then
    alter table public.lead_activities
      add constraint lead_activities_quote_id_fkey
      foreign key (quote_id) references public.quotes(id) on delete set null;
  end if;
end;
$$;

-- =========================================================
-- 8. Indices para que Supabase responda rapido
-- =========================================================

create index if not exists idx_profiles_user_id on public.crm_user_profiles(user_id);
create index if not exists idx_profiles_org_id on public.crm_user_profiles(organization_id);
create index if not exists idx_sales_reps_org_active on public.sales_reps(organization_id, active);

create index if not exists idx_customers_org_name on public.customers(organization_id, full_name);
create index if not exists idx_customers_org_phone on public.customers(organization_id, phone);
create index if not exists idx_customer_vehicles_customer on public.customer_vehicles(customer_id);
create index if not exists idx_customer_vehicles_org_type on public.customer_vehicles(organization_id, vehicle_type);

create index if not exists idx_leads_org_id on public.leads(organization_id);
create index if not exists idx_leads_customer_id on public.leads(customer_id);
create index if not exists idx_leads_vehicle_id on public.leads(vehicle_id);
create index if not exists idx_leads_assigned_rep on public.leads(assigned_rep_id);
create index if not exists idx_leads_stage on public.leads(stage);
create index if not exists idx_leads_interest_type on public.leads(organization_id, interest_type);
create index if not exists idx_leads_next_follow_up on public.leads(organization_id, next_follow_up_at);

create index if not exists idx_activities_org_lead on public.lead_activities(organization_id, lead_id);
create index if not exists idx_activities_org_customer on public.lead_activities(organization_id, customer_id);

create index if not exists idx_service_catalog_org_active on public.service_catalog(organization_id, active);
create index if not exists idx_parts_inventory_org_category on public.parts_inventory(organization_id, category);
create index if not exists idx_parts_inventory_part_number on public.parts_inventory(organization_id, part_number);
create index if not exists idx_parts_inventory_sku on public.parts_inventory(organization_id, sku);

create index if not exists idx_service_orders_org_status on public.service_orders(organization_id, status);
create index if not exists idx_service_orders_customer on public.service_orders(customer_id);
create index if not exists idx_service_orders_vehicle on public.service_orders(vehicle_id);
create index if not exists idx_service_order_items_order on public.service_order_items(service_order_id);

create index if not exists idx_quotes_org_status on public.quotes(organization_id, status);
create index if not exists idx_quotes_customer on public.quotes(customer_id);
create index if not exists idx_quote_items_quote on public.quote_items(quote_id);

create index if not exists idx_tasks_org_status on public.follow_up_tasks(organization_id, status);
create index if not exists idx_tasks_due_at on public.follow_up_tasks(organization_id, due_at);
create index if not exists idx_automation_logs_org_created on public.automation_logs(organization_id, created_at desc);

-- =========================================================
-- 9. Triggers de updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_sales_reps_updated_at on public.sales_reps;
create trigger set_sales_reps_updated_at before update on public.sales_reps
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.crm_user_profiles;
create trigger set_profiles_updated_at before update on public.crm_user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_vehicles_updated_at on public.customer_vehicles;
create trigger set_customer_vehicles_updated_at before update on public.customer_vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists set_service_catalog_updated_at on public.service_catalog;
create trigger set_service_catalog_updated_at before update on public.service_catalog
for each row execute function public.set_updated_at();

drop trigger if exists set_parts_inventory_updated_at on public.parts_inventory;
create trigger set_parts_inventory_updated_at before update on public.parts_inventory
for each row execute function public.set_updated_at();

drop trigger if exists set_service_orders_updated_at on public.service_orders;
create trigger set_service_orders_updated_at before update on public.service_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_service_order_items_updated_at on public.service_order_items;
create trigger set_service_order_items_updated_at before update on public.service_order_items
for each row execute function public.set_updated_at();

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at before update on public.quotes
for each row execute function public.set_updated_at();

drop trigger if exists set_quote_items_updated_at on public.quote_items;
create trigger set_quote_items_updated_at before update on public.quote_items
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.follow_up_tasks;
create trigger set_tasks_updated_at before update on public.follow_up_tasks
for each row execute function public.set_updated_at();

-- =========================================================
-- 10. Funciones de usuario actual y arranque automatico
-- =========================================================

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

create or replace function public.crm_is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.crm_current_role() in ('owner', 'admin', 'manager'), false);
$$;

create or replace function public.crm_bootstrap_holeshot_profile(profile_email text default null)
returns public.crm_user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_profile public.crm_user_profiles;
  v_email text;
  v_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_email := coalesce(nullif(profile_email, ''), (select email from auth.users where id = v_user_id), 'usuario@holeshot.local');
  v_name := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Holeshot Owner');

  insert into public.organizations (
    name,
    slug,
    niche,
    primary_email,
    business_type,
    country,
    timezone,
    active
  )
  values (
    'Holeshot',
    'holeshot',
    'Servicio, piezas, motoras y ATV de motocross',
    v_email,
    'motocross_service_parts',
    'Puerto Rico',
    'America/Puerto_Rico',
    true
  )
  on conflict (slug) do update
    set name = excluded.name,
        niche = excluded.niche,
        primary_email = coalesce(public.organizations.primary_email, excluded.primary_email),
        business_type = excluded.business_type,
        country = coalesce(public.organizations.country, excluded.country),
        timezone = excluded.timezone,
        active = true,
        updated_at = now()
  returning id into v_org_id;

  insert into public.sales_reps (organization_id, name, initials, department, specialties, active)
  select v_org_id, 'Ventas', 'VE', 'Ventas', array['leads', 'cotizaciones', 'clientes'], true
  where not exists (
    select 1 from public.sales_reps where organization_id = v_org_id and name = 'Ventas'
  );

  insert into public.sales_reps (organization_id, name, initials, department, specialties, active)
  select v_org_id, 'Servicio', 'SV', 'Servicio', array['diagnostico', 'ordenes de servicio', 'motoras', 'atv'], true
  where not exists (
    select 1 from public.sales_reps where organization_id = v_org_id and name = 'Servicio'
  );

  insert into public.sales_reps (organization_id, name, initials, department, specialties, active)
  select v_org_id, 'Piezas', 'PZ', 'Piezas', array['inventario', 'partes', 'cotizaciones'], true
  where not exists (
    select 1 from public.sales_reps where organization_id = v_org_id and name = 'Piezas'
  );

  insert into public.crm_user_profiles (user_id, organization_id, full_name, email, role, active)
  values (v_user_id, v_org_id, v_name, v_email, 'owner', true)
  on conflict (user_id) do update
    set organization_id = excluded.organization_id,
        email = excluded.email,
        active = true,
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.crm_bootstrap_holeshot_profile(text) to authenticated;

-- =========================================================
-- 11. Seguridad: Row Level Security
-- =========================================================

alter table public.organizations enable row level security;
alter table public.crm_user_profiles enable row level security;
alter table public.sales_reps enable row level security;
alter table public.customers enable row level security;
alter table public.customer_vehicles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.service_catalog enable row level security;
alter table public.parts_inventory enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.automation_logs enable row level security;

drop policy if exists "organizations_select_own" on public.organizations;
drop policy if exists "organizations_update_admin" on public.organizations;
drop policy if exists "profiles_select_self" on public.crm_user_profiles;
drop policy if exists "profiles_admin_all" on public.crm_user_profiles;
drop policy if exists "sales_reps_select_own_org" on public.sales_reps;
drop policy if exists "sales_reps_manage_admin_manager" on public.sales_reps;
drop policy if exists "customers_manage_own_org" on public.customers;
drop policy if exists "customer_vehicles_manage_own_org" on public.customer_vehicles;
drop policy if exists "leads_select_by_role" on public.leads;
drop policy if exists "leads_insert_own_org" on public.leads;
drop policy if exists "leads_update_by_role" on public.leads;
drop policy if exists "leads_delete_admin_manager" on public.leads;
drop policy if exists "activities_select_own_org" on public.lead_activities;
drop policy if exists "activities_insert_own_org" on public.lead_activities;
drop policy if exists "service_catalog_manage_own_org" on public.service_catalog;
drop policy if exists "parts_inventory_manage_own_org" on public.parts_inventory;
drop policy if exists "service_orders_manage_own_org" on public.service_orders;
drop policy if exists "service_order_items_manage_own_org" on public.service_order_items;
drop policy if exists "quotes_manage_own_org" on public.quotes;
drop policy if exists "quote_items_manage_own_org" on public.quote_items;
drop policy if exists "tasks_manage_own_org" on public.follow_up_tasks;
drop policy if exists "automation_logs_admin_select" on public.automation_logs;

create policy "organizations_select_own"
on public.organizations for select
to authenticated
using (id = public.crm_current_organization_id() and active = true);

create policy "organizations_update_admin"
on public.organizations for update
to authenticated
using (id = public.crm_current_organization_id() and public.crm_current_role() in ('owner', 'admin'))
with check (id = public.crm_current_organization_id() and public.crm_current_role() in ('owner', 'admin'));

create policy "profiles_select_self"
on public.crm_user_profiles for select
to authenticated
using (user_id = auth.uid() and active = true);

create policy "profiles_admin_all"
on public.crm_user_profiles for all
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin')
)
with check (
  organization_id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin')
);

create policy "sales_reps_select_own_org"
on public.sales_reps for select
to authenticated
using (organization_id = public.crm_current_organization_id());

create policy "sales_reps_manage_admin_manager"
on public.sales_reps for all
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin', 'manager')
)
with check (
  organization_id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin', 'manager')
);

create policy "customers_manage_own_org"
on public.customers for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "customer_vehicles_manage_own_org"
on public.customer_vehicles for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "leads_select_by_role"
on public.leads for select
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
    or assigned_rep_id is null
  )
);

create policy "leads_insert_own_org"
on public.leads for insert
to authenticated
with check (organization_id = public.crm_current_organization_id());

create policy "leads_update_by_role"
on public.leads for update
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and (
    public.crm_current_role() in ('owner', 'admin', 'manager')
    or assigned_rep_id = public.crm_current_sales_rep_id()
    or assigned_rep_id is null
  )
)
with check (organization_id = public.crm_current_organization_id());

create policy "leads_delete_admin_manager"
on public.leads for delete
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin', 'manager')
);

create policy "activities_select_own_org"
on public.lead_activities for select
to authenticated
using (organization_id = public.crm_current_organization_id());

create policy "activities_insert_own_org"
on public.lead_activities for insert
to authenticated
with check (organization_id = public.crm_current_organization_id());

create policy "service_catalog_manage_own_org"
on public.service_catalog for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "parts_inventory_manage_own_org"
on public.parts_inventory for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "service_orders_manage_own_org"
on public.service_orders for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "service_order_items_manage_own_org"
on public.service_order_items for all
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and exists (
    select 1
    from public.service_orders so
    where so.id = public.service_order_items.service_order_id
      and so.organization_id = public.crm_current_organization_id()
  )
)
with check (
  organization_id = public.crm_current_organization_id()
  and exists (
    select 1
    from public.service_orders so
    where so.id = public.service_order_items.service_order_id
      and so.organization_id = public.crm_current_organization_id()
  )
);

create policy "quotes_manage_own_org"
on public.quotes for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "quote_items_manage_own_org"
on public.quote_items for all
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and exists (
    select 1
    from public.quotes q
    where q.id = public.quote_items.quote_id
      and q.organization_id = public.crm_current_organization_id()
  )
)
with check (
  organization_id = public.crm_current_organization_id()
  and exists (
    select 1
    from public.quotes q
    where q.id = public.quote_items.quote_id
      and q.organization_id = public.crm_current_organization_id()
  )
);

create policy "tasks_manage_own_org"
on public.follow_up_tasks for all
to authenticated
using (organization_id = public.crm_current_organization_id())
with check (organization_id = public.crm_current_organization_id());

create policy "automation_logs_admin_select"
on public.automation_logs for select
to authenticated
using (
  organization_id = public.crm_current_organization_id()
  and public.crm_current_role() in ('owner', 'admin')
);

-- =========================================================
-- 12. Datos iniciales de Holeshot
-- =========================================================

insert into public.organizations (
  name,
  slug,
  niche,
  primary_email,
  business_type,
  country,
  timezone,
  active
)
values (
  'Holeshot',
  'holeshot',
  'Servicio, piezas, motoras y ATV de motocross',
  'admin@holeshot.local',
  'motocross_service_parts',
  'Puerto Rico',
  'America/Puerto_Rico',
  true
)
on conflict (slug) do update
set name = excluded.name,
    niche = excluded.niche,
    business_type = excluded.business_type,
    country = excluded.country,
    timezone = excluded.timezone,
    active = true,
    updated_at = now();

insert into public.sales_reps (organization_id, name, initials, department, specialties, active)
select org.id, seed.name, seed.initials, seed.department, seed.specialties, true
from public.organizations org
cross join (
  values
    ('Ventas', 'VE', 'Ventas', array['leads', 'clientes', 'cotizaciones']::text[]),
    ('Servicio', 'SV', 'Servicio', array['diagnostico', 'mecanica', 'motoras', 'atv']::text[]),
    ('Piezas', 'PZ', 'Piezas', array['partes', 'inventario', 'suplidores']::text[])
) as seed(name, initials, department, specialties)
where org.slug = 'holeshot'
  and not exists (
    select 1
    from public.sales_reps sr
    where sr.organization_id = org.id
      and sr.name = seed.name
  );

insert into public.service_catalog (organization_id, code, name, category, description, labor_hours, base_price, sort_order, active)
select org.id, seed.code, seed.name, seed.category, seed.description, seed.labor_hours, seed.base_price, seed.sort_order, true
from public.organizations org
cross join (
  values
    ('DIAG-GRAL', 'Diagnostico general', 'Diagnostico', 'Revision inicial de motora o ATV para estimar servicio.', 1.0, 0, 10),
    ('SERV-ACEITE', 'Cambio de aceite y filtro', 'Mantenimiento', 'Servicio basico de aceite, filtro e inspeccion rapida.', 1.0, 0, 20),
    ('SERV-FRENOS', 'Servicio de frenos', 'Mantenimiento', 'Revision o reemplazo de pads, discos, liquido y ajuste.', 1.5, 0, 30),
    ('SERV-SUSP', 'Suspension y direccion', 'Mecanica', 'Revision, ajuste o reparacion de suspension y direccion.', 2.0, 0, 40),
    ('MOTOR-2T', 'Servicio motor 2T', 'Motor', 'Diagnostico o reparacion de motor dos tiempos.', 3.0, 0, 50),
    ('MOTOR-4T', 'Servicio motor 4T', 'Motor', 'Diagnostico o reparacion de motor cuatro tiempos.', 4.0, 0, 60),
    ('CARB-INY', 'Carburador / inyeccion', 'Motor', 'Limpieza, ajuste o reparacion de carburador o inyeccion.', 2.0, 0, 70),
    ('ELEC', 'Sistema electrico', 'Electricidad', 'Diagnostico de bateria, charging, luces o encendido.', 1.5, 0, 80),
    ('GOMAS', 'Gomas y ruedas', 'Ruedas', 'Montaje, reemplazo o balanceo segun aplica.', 1.0, 0, 90),
    ('INST-PIEZA', 'Instalacion de pieza', 'Piezas', 'Instalacion de pieza comprada o cotizada por Holeshot.', 1.0, 0, 100)
) as seed(code, name, category, description, labor_hours, base_price, sort_order)
where org.slug = 'holeshot'
  and not exists (
    select 1
    from public.service_catalog sc
    where sc.organization_id = org.id
      and sc.code = seed.code
  );

commit;
