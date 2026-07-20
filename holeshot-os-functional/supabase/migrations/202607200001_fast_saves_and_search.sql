-- Performance pass for faster CRM saves and searches.
create extension if not exists pg_trgm;

create index if not exists customers_full_name_trgm_idx on public.customers using gin (full_name gin_trgm_ops);
create index if not exists customers_phone_trgm_idx on public.customers using gin (phone gin_trgm_ops);
create index if not exists customers_email_trgm_idx on public.customers using gin (email gin_trgm_ops);

create index if not exists vehicles_make_trgm_idx on public.vehicles using gin (make gin_trgm_ops);
create index if not exists vehicles_model_trgm_idx on public.vehicles using gin (model gin_trgm_ops);
create index if not exists vehicles_vin_trgm_idx on public.vehicles using gin (vin gin_trgm_ops);

create index if not exists work_orders_ro_number_trgm_idx on public.work_orders using gin (ro_number gin_trgm_ops);
create index if not exists work_orders_problem_trgm_idx on public.work_orders using gin (problem_description gin_trgm_ops);
create index if not exists work_orders_active_created_idx
  on public.work_orders(created_at desc)
  where status not in ('Completed', 'Cancelled');

create index if not exists parts_part_name_trgm_idx on public.parts using gin (part_name gin_trgm_ops);
create index if not exists parts_brand_trgm_idx on public.parts using gin (brand gin_trgm_ops);
create index if not exists parts_oem_trgm_idx on public.parts using gin (oem_part_number gin_trgm_ops);
create index if not exists parts_aftermarket_trgm_idx on public.parts using gin (aftermarket_part_number gin_trgm_ops);
create index if not exists parts_in_stock_name_idx on public.parts(part_name) where quantity > 0;

create index if not exists library_make_trgm_idx on public.technical_library using gin (make gin_trgm_ops);
create index if not exists library_model_trgm_idx on public.technical_library using gin (model gin_trgm_ops);
create index if not exists library_title_trgm_idx on public.technical_library using gin (title gin_trgm_ops);
create index if not exists library_spec_name_trgm_idx on public.technical_library using gin (spec_name gin_trgm_ops);
create index if not exists library_spec_value_trgm_idx on public.technical_library using gin (spec_value gin_trgm_ops);

create or replace function public.create_work_order_fast(
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_problem_description text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_work_order_id uuid;
begin
  if not exists (
    select 1
    from public.vehicles
    where id = p_vehicle_id
      and customer_id = p_customer_id
  ) then
    raise exception 'El vehículo no pertenece al cliente seleccionado.';
  end if;

  insert into public.work_orders (customer_id, vehicle_id, problem_description)
  values (p_customer_id, p_vehicle_id, nullif(btrim(p_problem_description), ''))
  returning id into new_work_order_id;

  return new_work_order_id;
end;
$$;

create or replace function public.add_work_order_part_fast(
  p_work_order_id uuid,
  p_part_id uuid,
  p_quantity int
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_line_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Selecciona una cantidad válida.';
  end if;

  insert into public.work_order_parts (work_order_id, part_id, quantity, unit_price, total)
  select
    p_work_order_id,
    p_part_id,
    p_quantity,
    sale_price,
    round(sale_price * p_quantity, 2)
  from public.parts
  where id = p_part_id
  returning id into new_line_id;

  if new_line_id is null then
    raise exception 'Pieza no encontrada.';
  end if;

  return new_line_id;
end;
$$;

create or replace function public.sync_part_inventory()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  delta int;
begin
  if tg_op = 'INSERT' then
    update public.parts
    set quantity = quantity - new.quantity
    where id = new.part_id
      and quantity >= new.quantity;

    if not found then
      raise exception 'Inventario insuficiente.';
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    update public.parts
    set quantity = quantity + old.quantity
    where id = old.part_id;

    return old;
  else
    if new.part_id <> old.part_id then
      update public.parts
      set quantity = quantity + old.quantity
      where id = old.part_id;

      update public.parts
      set quantity = quantity - new.quantity
      where id = new.part_id
        and quantity >= new.quantity;

      if not found then
        raise exception 'Inventario insuficiente.';
      end if;
    else
      delta := new.quantity - old.quantity;

      if delta > 0 then
        update public.parts
        set quantity = quantity - delta
        where id = new.part_id
          and quantity >= delta;

        if not found then
          raise exception 'Inventario insuficiente.';
        end if;
      elsif delta < 0 then
        update public.parts
        set quantity = quantity + abs(delta)
        where id = new.part_id;
      end if;
    end if;

    return new;
  end if;
end;
$$;

create or replace function public.recalculate_work_order_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_id uuid;
  next_labor_total numeric(12,2);
  next_parts_total numeric(12,2);
begin
  target_id := coalesce(new.work_order_id, old.work_order_id);

  select coalesce(sum(labor_total), 0)
  into next_labor_total
  from public.work_order_services
  where work_order_id = target_id;

  select coalesce(sum(total), 0)
  into next_parts_total
  from public.work_order_parts
  where work_order_id = target_id;

  update public.work_orders
  set labor_total = next_labor_total,
      parts_total = next_parts_total,
      total = next_labor_total + next_parts_total
  where id = target_id;

  return coalesce(new, old);
end;
$$;

grant execute on function public.create_work_order_fast(uuid, uuid, text) to authenticated;
grant execute on function public.add_work_order_part_fast(uuid, uuid, int) to authenticated;
