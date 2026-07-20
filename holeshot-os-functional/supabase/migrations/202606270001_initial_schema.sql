-- HoleShot OS MVP schema
create extension if not exists pgcrypto;

create sequence if not exists public.work_order_ro_seq start 1;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  source text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  make text not null,
  model text not null,
  year int check (year is null or year between 1900 and 2100),
  vin text,
  engine_size text,
  vehicle_type text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  ro_number text unique,
  status text not null default 'New' check (status in (
    'New', 'Diagnosing', 'Waiting Approval', 'Approved', 'Waiting Parts',
    'In Progress', 'Ready for Pickup', 'Completed', 'Cancelled'
  )),
  problem_description text,
  diagnosis_summary text,
  approved boolean not null default false,
  labor_total numeric(12,2) not null default 0,
  parts_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  symptom text,
  test_performed text,
  result text,
  suspected_cause text,
  confirmed_cause text,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_order_services (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  service_name text not null,
  description text,
  labor_hours numeric(8,2) not null default 0 check (labor_hours >= 0),
  labor_rate numeric(12,2) not null default 0 check (labor_rate >= 0),
  labor_total numeric(12,2) not null default 0 check (labor_total >= 0),
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  part_name text not null,
  category text,
  brand text,
  oem_part_number text,
  aftermarket_part_number text,
  compatible_make text,
  compatible_model text,
  compatible_years text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  quantity int not null default 0 check (quantity >= 0),
  shelf_location text,
  supplier text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_order_parts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.technical_library (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year_start int,
  year_end int,
  category text,
  title text,
  spec_name text,
  spec_value text,
  notes text,
  source text,
  created_at timestamptz not null default now(),
  check (year_start is null or year_end is null or year_end >= year_start)
);

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  file_url text not null,
  file_type text,
  label text,
  notes text,
  created_at timestamptz not null default now(),
  check (work_order_id is not null or vehicle_id is not null)
);

create index if not exists customers_name_idx on public.customers using gin (to_tsvector('simple', full_name));
create index if not exists vehicles_customer_idx on public.vehicles(customer_id);
create index if not exists vehicles_make_model_idx on public.vehicles(make, model, year);
create index if not exists work_orders_customer_idx on public.work_orders(customer_id);
create index if not exists work_orders_vehicle_idx on public.work_orders(vehicle_id);
create index if not exists work_orders_status_idx on public.work_orders(status);
create index if not exists work_orders_created_idx on public.work_orders(created_at desc);
create index if not exists diagnostics_work_order_idx on public.diagnostics(work_order_id);
create index if not exists services_work_order_idx on public.work_order_services(work_order_id);
create index if not exists work_order_parts_work_order_idx on public.work_order_parts(work_order_id);
create index if not exists parts_name_idx on public.parts(part_name);
create index if not exists library_vehicle_idx on public.technical_library(make, model, year_start);
create index if not exists media_work_order_idx on public.media_files(work_order_id);
create index if not exists media_vehicle_idx on public.media_files(vehicle_id);

create or replace function public.assign_ro_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.ro_number is null or btrim(new.ro_number) = '' then
    new.ro_number := 'RO-' || lpad(nextval('public.work_order_ro_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_assign_ro on public.work_orders;
create trigger work_orders_assign_ro before insert on public.work_orders
for each row execute function public.assign_ro_number();

create or replace function public.calculate_service_total()
returns trigger language plpgsql set search_path = public as $$
begin
  new.labor_total := round(coalesce(new.labor_hours, 0) * coalesce(new.labor_rate, 0), 2);
  return new;
end;
$$;

drop trigger if exists services_calculate_total on public.work_order_services;
create trigger services_calculate_total before insert or update on public.work_order_services
for each row execute function public.calculate_service_total();

create or replace function public.calculate_part_line_total()
returns trigger language plpgsql set search_path = public as $$
begin
  new.total := round(coalesce(new.quantity, 0) * coalesce(new.unit_price, 0), 2);
  return new;
end;
$$;

drop trigger if exists work_order_parts_calculate_total on public.work_order_parts;
create trigger work_order_parts_calculate_total before insert or update on public.work_order_parts
for each row execute function public.calculate_part_line_total();

create or replace function public.sync_part_inventory()
returns trigger language plpgsql set search_path = public as $$
declare
  available int;
  delta int;
begin
  if tg_op = 'INSERT' then
    select quantity into available from public.parts where id = new.part_id for update;
    if available < new.quantity then raise exception 'Insufficient inventory'; end if;
    update public.parts set quantity = quantity - new.quantity where id = new.part_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.parts set quantity = quantity + old.quantity where id = old.part_id;
    return old;
  else
    if new.part_id <> old.part_id then
      update public.parts set quantity = quantity + old.quantity where id = old.part_id;
      select quantity into available from public.parts where id = new.part_id for update;
      if available < new.quantity then raise exception 'Insufficient inventory'; end if;
      update public.parts set quantity = quantity - new.quantity where id = new.part_id;
    else
      delta := new.quantity - old.quantity;
      if delta > 0 then
        select quantity into available from public.parts where id = new.part_id for update;
        if available < delta then raise exception 'Insufficient inventory'; end if;
      end if;
      update public.parts set quantity = quantity - delta where id = new.part_id;
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists work_order_parts_sync_inventory on public.work_order_parts;
create trigger work_order_parts_sync_inventory after insert or update or delete on public.work_order_parts
for each row execute function public.sync_part_inventory();

create or replace function public.recalculate_work_order_totals()
returns trigger language plpgsql set search_path = public as $$
declare target_id uuid;
begin
  target_id := coalesce(new.work_order_id, old.work_order_id);
  update public.work_orders
  set labor_total = coalesce((select sum(labor_total) from public.work_order_services where work_order_id = target_id), 0),
      parts_total = coalesce((select sum(total) from public.work_order_parts where work_order_id = target_id), 0),
      total = coalesce((select sum(labor_total) from public.work_order_services where work_order_id = target_id), 0)
            + coalesce((select sum(total) from public.work_order_parts where work_order_id = target_id), 0)
  where id = target_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists services_recalculate_order on public.work_order_services;
create trigger services_recalculate_order after insert or update or delete on public.work_order_services
for each row execute function public.recalculate_work_order_totals();
drop trigger if exists parts_recalculate_order on public.work_order_parts;
create trigger parts_recalculate_order after insert or update or delete on public.work_order_parts
for each row execute function public.recalculate_work_order_totals();

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.work_orders enable row level security;
alter table public.diagnostics enable row level security;
alter table public.work_order_services enable row level security;
alter table public.parts enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.technical_library enable row level security;
alter table public.media_files enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'customers','vehicles','work_orders','diagnostics','work_order_services',
    'parts','work_order_parts','technical_library','media_files'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Authenticated users can manage ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      'Authenticated users can manage ' || table_name, table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'work-order-media',
  'work-order-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated media uploads" on storage.objects;
create policy "Authenticated media uploads" on storage.objects for insert to authenticated
with check (bucket_id = 'work-order-media');
drop policy if exists "Authenticated media updates" on storage.objects;
create policy "Authenticated media updates" on storage.objects for update to authenticated
using (bucket_id = 'work-order-media') with check (bucket_id = 'work-order-media');
drop policy if exists "Authenticated media deletes" on storage.objects;
create policy "Authenticated media deletes" on storage.objects for delete to authenticated
using (bucket_id = 'work-order-media');
drop policy if exists "Public media reads" on storage.objects;
create policy "Public media reads" on storage.objects for select to public
using (bucket_id = 'work-order-media');

insert into public.technical_library
  (make, model, year_start, year_end, category, title, spec_name, spec_value, notes, source)
values
  ('Honda', 'TRX450ER', 2006, 2006, 'Engine', 'Valve clearance', 'Intake valve clearance', '0.16 ± 0.03 mm', null, 'Initial HoleShot OS seed'),
  ('Honda', 'TRX450ER', 2006, 2006, 'Engine', 'Valve clearance', 'Exhaust valve clearance', '0.28 ± 0.03 mm', null, 'Initial HoleShot OS seed'),
  ('Honda', 'TRX450ER', 2006, 2006, 'Engine', 'Compression', 'Compression spec', '50–64 psi with auto-decompressor', null, 'Initial HoleShot OS seed'),
  ('Yamaha', 'YZ250F', 2010, 2010, 'Carburetion', 'Stock jetting', 'Main jet stock', '180', null, 'Initial HoleShot OS seed'),
  ('Yamaha', 'YZ250F', 2010, 2010, 'Carburetion', 'Stock jetting', 'Pilot jet stock', '42', null, 'Initial HoleShot OS seed'),
  ('Yamaha', 'YZ250F', 2010, 2010, 'Carburetion', 'Stock jetting', 'Leak jet stock', '70', null, 'Initial HoleShot OS seed'),
  ('Yamaha', 'YZ250F', 2010, 2010, 'Carburetion', 'Stock jetting', 'Starter jet stock', '65', null, 'Initial HoleShot OS seed'),
  ('Suzuki', 'RM125', 2003, 2003, 'Suspension', 'Suspension reference', 'Placeholder', 'Pending verified specifications', 'Replace with a verified service-manual source.', 'Initial HoleShot OS seed');
