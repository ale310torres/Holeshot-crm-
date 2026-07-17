create extension if not exists pgcrypto;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  channel text,
  type text,
  last_contact date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  title text not null,
  interest text,
  brand text,
  model text,
  budget numeric default 0,
  value numeric default 0,
  urgency text,
  stage text default 'Nuevo lead',
  owner text,
  next_action text,
  follow_up_date date,
  notes text,
  lost_reason text,
  created_at timestamptz default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  asset text,
  request text not null,
  stage text default 'Solicitud recibida',
  quoted_value numeric default 0,
  due_date date,
  owner text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date date,
  owner text,
  priority text default 'Media',
  status text default 'Pendiente',
  related_type text,
  related_id uuid,
  created_at timestamptz default now()
);

alter table opportunities add column if not exists brand text;
alter table opportunities add column if not exists model text;

create index if not exists opportunities_contact_id_idx on opportunities(contact_id);
create index if not exists services_contact_id_idx on services(contact_id);
create index if not exists tasks_due_date_idx on tasks(due_date);

alter table contacts enable row level security;
alter table opportunities enable row level security;
alter table services enable row level security;
alter table tasks enable row level security;

drop policy if exists "Holeshot authenticated users can manage contacts" on contacts;
drop policy if exists "Holeshot authenticated users can manage opportunities" on opportunities;
drop policy if exists "Holeshot authenticated users can manage services" on services;
drop policy if exists "Holeshot authenticated users can manage tasks" on tasks;

create policy "Holeshot authenticated users can manage contacts"
on contacts
for all
to authenticated
using (true)
with check (true);

create policy "Holeshot authenticated users can manage opportunities"
on opportunities
for all
to authenticated
using (true)
with check (true);

create policy "Holeshot authenticated users can manage services"
on services
for all
to authenticated
using (true)
with check (true);

create policy "Holeshot authenticated users can manage tasks"
on tasks
for all
to authenticated
using (true)
with check (true);


