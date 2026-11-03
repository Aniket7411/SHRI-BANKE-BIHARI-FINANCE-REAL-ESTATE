-- =============================================================================
-- Property requirements & alerts.
-- A visitor tells us what they're looking for (buy/rent, city, localities, type,
-- budget, BHK). Each requirement is also a CRM lead, so it's assigned and
-- followed up like any other enquiry. When a new property matches, the admin
-- picks which requirements to notify (email / WhatsApp); every alert is logged so
-- nobody hears about the same property twice. Customers can stop alerts from the
-- link in every email.
-- Idempotent — safe to run more than once.
-- =============================================================================

create table if not exists requirements (
  id                uuid primary key default gen_random_uuid(),
  ref               bigint generated always as identity (start with 101) unique,   -- shown as R-101
  lead_id           uuid references leads (id) on delete set null,
  name              text not null,
  phone             text not null,
  phone_norm        text not null,                                  -- last 10 digits
  email             text,
  purpose           text not null default 'Buy' check (purpose in ('Buy', 'Rent')),
  city              text not null default '',                       -- '' = any city
  localities        text[] not null default '{}',                   -- empty = anywhere in the city
  category          text not null default '',                       -- '' = any
  types             text[] not null default '{}',
  budget_min        numeric(14, 2),
  budget_max        numeric(14, 2),
  beds              integer[] not null default '{}',                -- 5 = 5+
  notes             text not null default '',
  alerts            boolean not null default true,                  -- customer agreed to (and hasn't stopped) alerts
  status            text not null default 'active' check (status in ('active', 'contacted', 'closed')),
  source            text not null default 'website',
  token             text not null unique,                           -- for the "stop alerts" link
  last_notified_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists requirements_status_idx on requirements (status, created_at desc);
create index if not exists requirements_phone_idx  on requirements (phone_norm);
create index if not exists requirements_lead_idx   on requirements (lead_id);

drop trigger if exists requirements_updated on requirements;
create trigger requirements_updated before update on requirements for each row execute function set_updated_at();

-- One row per property sent to a requirement, per channel.
create table if not exists requirement_alerts (
  id              bigint generated always as identity primary key,
  requirement_id  uuid not null references requirements (id) on delete cascade,
  property_id     text not null references properties (id) on delete cascade on update cascade,
  channel         text not null check (channel in ('email', 'whatsapp')),
  sent_by         uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (requirement_id, property_id, channel)
);

create index if not exists requirement_alerts_property_idx on requirement_alerts (property_id);

alter table requirements       enable row level security;
alter table requirement_alerts enable row level security;

-- Admins see everything; agents see requirements whose lead is assigned to them.
-- Public submissions and "stop alerts" go through the service role.
create or replace function can_see_requirement(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from requirements r join leads l on l.id = r.lead_id
    where r.id = rid and l.assigned_to = auth.uid()
  );
$$;

drop policy if exists "staff read requirements" on requirements;
create policy "staff read requirements" on requirements for select using (is_staff() and can_see_requirement(id));
drop policy if exists "staff update requirements" on requirements;
create policy "staff update requirements" on requirements for update
  using (is_staff() and can_see_requirement(id)) with check (is_staff() and can_see_requirement(id));
drop policy if exists "admin delete requirements" on requirements;
create policy "admin delete requirements" on requirements for delete using (is_admin());

drop policy if exists "staff read requirement alerts" on requirement_alerts;
create policy "staff read requirement alerts" on requirement_alerts for select using (is_staff() and can_see_requirement(requirement_id));
drop policy if exists "staff log requirement alerts" on requirement_alerts;
create policy "staff log requirement alerts" on requirement_alerts for insert
  with check (is_staff() and can_see_requirement(requirement_id));
