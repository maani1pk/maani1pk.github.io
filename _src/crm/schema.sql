-- Abdur Studio CRM: database schema for Supabase (Postgres).
-- Run this whole file once in the Supabase SQL editor. It is safe to run again.
-- Access model: visitors can only call submit_inquiry(); everything else requires a logged-in admin (see public.admins).

create sequence if not exists public.client_id_seq start 1;

-- People allowed into /admin. Add yourself after creating your user in Supabase Auth (see CRM_SETUP.md).
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique default ('AS-' || lpad(nextval('public.client_id_seq')::text, 4, '0')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  company text check (company is null or char_length(company) <= 160),
  email text check (email is null or (char_length(email) <= 160 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9+() .-]{6,25}$'),
  project_type text not null check (char_length(btrim(project_type)) between 1 and 80),
  budget text check (budget is null or char_length(budget) <= 60),
  description text not null check (char_length(btrim(description)) between 1 and 3000),
  source text not null default 'Abdur Studio Portfolio' check (char_length(source) <= 80),
  status text not null default 'NEW LEAD' check (status in
    ('NEW LEAD', 'CONTACTED', 'DISCUSSION', 'PROPOSAL SENT', 'NEGOTIATION', 'ACTIVE CLIENT', 'COMPLETED', 'LOST', 'ARCHIVED')),
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  project_value numeric(14, 2) check (project_value is null or project_value >= 0),
  agreed_budget numeric(14, 2) check (agreed_budget is null or agreed_budget >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  last_contact date,
  next_followup date,
  internal_notes text not null default '' check (char_length(internal_notes) <= 20000),
  constraint clients_has_contact_method check (email is not null or whatsapp is not null)
);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_followup_idx on public.clients (next_followup) where next_followup is not null;
create index if not exists clients_created_idx on public.clients (created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();

-- Results of Google Sheets synchronisations, shown in the dashboard.
create table if not exists public.sync_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null default 'auto',
  ok boolean not null,
  row_count integer,
  message text
);

-- Spam and flood protection: hashed visitor address per attempt. Nobody can read this table through the API.
create table if not exists public.inquiry_attempts (
  id bigserial primary key,
  at timestamptz not null default now(),
  ip_hash text not null
);
create index if not exists inquiry_attempts_ip_idx on public.inquiry_attempts (ip_hash, at);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- The only thing the public website can do: file an inquiry. Returns the new Client ID after the row is saved.
create or replace function public.submit_inquiry(
  p_name text, p_company text, p_email text, p_whatsapp text,
  p_project_type text, p_budget text, p_description text,
  p_website text default '', p_source text default 'Abdur Studio Portfolio')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_headers json;
  v_ip text;
  v_ip_hash text;
  v_recent integer;
  v_existing text;
  v_id text;
begin
  -- Honeypot: real visitors never see the hidden "website" field. Bots get a fake success and nothing is stored.
  if btrim(coalesce(p_website, '')) <> '' then
    return 'AS-0000';
  end if;

  p_name := btrim(coalesce(p_name, ''));
  p_company := nullif(btrim(coalesce(p_company, '')), '');
  p_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  p_whatsapp := nullif(btrim(coalesce(p_whatsapp, '')), '');
  p_project_type := btrim(coalesce(p_project_type, ''));
  p_budget := nullif(btrim(coalesce(p_budget, '')), '');
  p_description := btrim(coalesce(p_description, ''));
  p_source := left(coalesce(nullif(btrim(p_source), ''), 'Abdur Studio Portfolio'), 80);

  if p_name = '' then raise exception 'name_required'; end if;
  if p_description = '' then raise exception 'description_required'; end if;
  if p_project_type = '' then raise exception 'project_type_required'; end if;
  if p_email is null and p_whatsapp is null then raise exception 'contact_required'; end if;
  if p_email is not null and p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'email_invalid'; end if;
  if p_whatsapp is not null and p_whatsapp !~ '^[0-9+() .-]{6,25}$' then raise exception 'whatsapp_invalid'; end if;
  if char_length(p_name) > 120 or char_length(coalesce(p_company, '')) > 160 or char_length(p_description) > 3000 then raise exception 'too_long'; end if;

  -- Flood control: 5 inquiries per visitor address per hour.
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    v_headers := '{}'::json;
  end;
  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1));
  v_ip_hash := encode(sha256(convert_to(coalesce(nullif(v_ip, ''), 'unknown'), 'UTF8')), 'hex');
  delete from public.inquiry_attempts where at < now() - interval '1 day';
  select count(*) into v_recent from public.inquiry_attempts where ip_hash = v_ip_hash and at > now() - interval '1 hour';
  if v_recent >= 5 then raise exception 'rate_limited'; end if;

  -- Double-click protection: the same inquiry within 10 minutes returns the existing Client ID instead of a duplicate.
  select client_id into v_existing from public.clients
   where created_at > now() - interval '10 minutes'
     and lower(name) = lower(p_name)
     and description = p_description
     and coalesce(email, '') = coalesce(p_email, '')
   order by created_at desc limit 1;
  if v_existing is not null then return v_existing; end if;

  insert into public.clients (name, company, email, whatsapp, project_type, budget, description, source)
  values (p_name, p_company, p_email, p_whatsapp, p_project_type, p_budget, p_description, p_source)
  returning client_id into v_id;
  insert into public.inquiry_attempts (ip_hash) values (v_ip_hash);
  return v_id;
end $$;

-- Row level security: the browser key can never read or change client data.
alter table public.clients enable row level security;
alter table public.admins enable row level security;
alter table public.sync_log enable row level security;
alter table public.inquiry_attempts enable row level security;

drop policy if exists clients_admin_all on public.clients;
create policy clients_admin_all on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists admins_read_self on public.admins;
create policy admins_read_self on public.admins for select to authenticated using (user_id = auth.uid());
drop policy if exists sync_log_admin_read on public.sync_log;
create policy sync_log_admin_read on public.sync_log for select to authenticated using (public.is_admin());

revoke all on public.clients, public.admins, public.sync_log, public.inquiry_attempts from anon, public;
grant select, insert, update, delete on public.clients to authenticated;
grant usage on sequence public.client_id_seq to authenticated;
grant select on public.admins, public.sync_log to authenticated;
revoke all on function public.submit_inquiry(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
