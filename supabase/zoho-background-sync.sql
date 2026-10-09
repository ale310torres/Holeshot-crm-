begin;
create table if not exists public.zoho_imported_contacts (
 organization_id uuid not null references public.organizations(id),
 zoho_contact_id text not null,
 lead_id uuid references public.leads(id),
 contact_name text not null,
 issue text,
 synced_at timestamptz not null default now(),
 primary key(organization_id,zoho_contact_id)
);
create table if not exists public.zoho_sync_state (
 organization_id uuid primary key references public.organizations(id),
 resource text not null default 'contacts',
 page integer not null default 1,
 locked_until timestamptz not null default '1970-01-01',
 last_completed_at timestamptz,
 last_error text,
 updated_at timestamptz not null default now()
);
alter table public.zoho_imported_contacts enable row level security;
alter table public.zoho_sync_state enable row level security;
revoke all on public.zoho_imported_contacts,public.zoho_sync_state from anon,authenticated;
grant all on public.zoho_imported_contacts,public.zoho_sync_state to service_role;
grant select on public.zoho_imported_contacts,public.zoho_sync_state to authenticated;
drop policy if exists zoho_imports_read on public.zoho_imported_contacts;
create policy zoho_imports_read on public.zoho_imported_contacts for select to authenticated
using(organization_id=public.crm_current_organization_id() and public.crm_is_manager());
drop policy if exists zoho_sync_read on public.zoho_sync_state;
create policy zoho_sync_read on public.zoho_sync_state for select to authenticated
using(organization_id=public.crm_current_organization_id() and public.crm_is_manager());

-- Import and link are one transaction, serialized per organization. Never overwrite a manual link.
create or replace function public.zoho_import_contact(p_org uuid,p_contact jsonb)
returns text language plpgsql set search_path=public as $$
declare
 cid text:=p_contact->>'contact_id';
 cname text:=left(trim(p_contact->>'contact_name'),250);
 tel text:=coalesce(nullif(p_contact->>'phone',''),p_contact->>'mobile','');
 norm text:=regexp_replace(tel,'[^0-9]','','g');
 mail text:=lower(trim(coalesce(p_contact->>'email','')));
 ids uuid[];
 target uuid;
 existing_contact text;
 outcome text;
begin
 if cid is null or cid !~ '^[0-9]{1,30}$' or coalesce(cname,'')='' then raise exception 'Invalid contact'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,0));
 select lead_id into target from zoho_imported_contacts where organization_id=p_org and zoho_contact_id=cid;
 if target is null then
  select array_agg(distinct lead_id) into ids from zoho_customer_links where organization_id=p_org and zoho_contact_id=cid;
  if cardinality(ids)>0 then target:=ids[1]; end if;
 end if;
 if target is null then
  -- A US phone may include its +1 prefix. Do not match short/local numbers.
  if length(norm)=11 and left(norm,1)='1' then norm:=substr(norm,2); end if;
  select array_agg(id) into ids from leads where organization_id=p_org and (
   (length(norm)=10 and right(regexp_replace(coalesce(phone,''),'[^0-9]','','g'),10)=norm
    and length(regexp_replace(coalesce(phone,''),'[^0-9]','','g')) in (10,11))
   or (mail<>'' and lower(trim(email))=mail));
  if cardinality(ids)=1 then target:=ids[1];
  elsif cardinality(ids)>1 then outcome:='Coincidencia de contacto ambigua';
  elsif exists(select 1 from leads where organization_id=p_org and lower(trim(full_name))=lower(cname)) then
   outcome:='Mismo nombre: confirmar teléfono o correo';
  else
   insert into leads(organization_id,full_name,phone,email,source,stage,lead_status,notes,next_action)
   values(p_org,cname,nullif(tel,''),nullif(mail,''),'Zoho Books','Contactado','open',
    'Cliente importado de Zoho Books. No representa un lead nuevo de publicidad.',
    'Consultar historial en Zoho; crear oportunidad solo si hay una solicitud nueva') returning id into target;
  end if;
 end if;
 if target is not null then
  select zoho_contact_id into existing_contact from zoho_customer_links where organization_id=p_org and lead_id=target;
  if existing_contact is not null and existing_contact<>cid then
   outcome:='El registro CRM ya está vinculado a otro contacto'; target:=null;
  else
   insert into zoho_customer_links(organization_id,lead_id,zoho_contact_id) values(p_org,target,cid)
   on conflict(organization_id,lead_id) do nothing;
  end if;
 end if;
 insert into zoho_imported_contacts(organization_id,zoho_contact_id,lead_id,contact_name,issue)
 values(p_org,cid,target,cname,outcome)
 on conflict(organization_id,zoho_contact_id) do update set lead_id=excluded.lead_id,
 contact_name=excluded.contact_name,issue=excluded.issue,synced_at=now();
 return coalesce(outcome,'linked');
end $$;
revoke all on function public.zoho_import_contact(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.zoho_import_contact(uuid,jsonb) to service_role;
commit;
