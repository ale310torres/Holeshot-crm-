begin;
create table if not exists public.zoho_connections (
  organization_id uuid primary key references public.organizations(id),
  zoho_organization_id text not null,
  encrypted_refresh_token text not null,
  connected_at timestamptz not null default now()
);
alter table public.zoho_connections add column if not exists encrypted_access_token text;
alter table public.zoho_connections add column if not exists access_token_expires_at timestamptz;
alter table public.zoho_connections add column if not exists token_refresh_until timestamptz not null default '1970-01-01T00:00:00Z';
create table if not exists public.zoho_oauth_states (
  state_hash text primary key,
  organization_id uuid not null references public.organizations(id),
  expires_at timestamptz not null
);
create table if not exists public.zoho_customer_links (
  organization_id uuid not null references public.organizations(id),
  lead_id uuid not null references public.leads(id),
  zoho_contact_id text not null,
  primary key (organization_id, lead_id)
);
create table if not exists public.zoho_documents (
  organization_id uuid not null references public.organizations(id),
  zoho_document_id text not null,
  document_type text not null check (document_type in ('invoice','estimate')),
  zoho_contact_id text not null,
  document_number text,
  document_date date,
  status text,
  currency_code text,
  total numeric,
  balance numeric,
  synced_at timestamptz not null default now(),
  primary key (organization_id, document_type, zoho_document_id)
);
create table if not exists public.zoho_creation_requests (
 organization_id uuid not null references public.organizations(id),
 request_id uuid not null,
 lead_id uuid not null references public.leads(id),
 document_type text not null check(document_type in ('invoice','estimate')),
 zoho_document_id text,
 created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table public.zoho_creation_requests enable row level security;
revoke all on public.zoho_creation_requests from anon,authenticated;
grant all on public.zoho_creation_requests to service_role;
alter table public.zoho_connections enable row level security;
alter table public.zoho_oauth_states enable row level security;
alter table public.zoho_customer_links enable row level security;
alter table public.zoho_documents enable row level security;
-- Tokens and OAuth state are accessible only to the server service role.
revoke all on public.zoho_connections, public.zoho_oauth_states from anon, authenticated;
grant all on public.zoho_connections, public.zoho_oauth_states, public.zoho_customer_links, public.zoho_documents to service_role;
revoke all on public.zoho_customer_links, public.zoho_documents from anon, authenticated;
grant select on public.zoho_customer_links, public.zoho_documents to authenticated;
drop policy if exists zoho_links_read on public.zoho_customer_links;
drop policy if exists zoho_documents_read on public.zoho_documents;
create policy zoho_links_read on public.zoho_customer_links for select to authenticated
using (organization_id = public.crm_current_organization_id() and public.crm_is_manager());
create policy zoho_documents_read on public.zoho_documents for select to authenticated
using (organization_id = public.crm_current_organization_id() and public.crm_is_manager());
commit;
