-- =============================================================================
-- Customer reviews after a closed deal.
-- When a lead is marked "Won", the team creates a private review link and sends
-- it on WhatsApp / email. The buyer rates and reviews; it lands in Reviews as
-- "pending" (hidden) until an admin approves it for the website.
-- Idempotent — safe to run more than once.
-- =============================================================================

create table if not exists review_requests (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,                                -- unguessable, goes in the link
  lead_id       uuid references leads (id) on delete cascade,
  property_id   text references properties (id) on delete set null,
  name          text not null,
  phone         text not null default '',
  email         text,
  role_hint     text not null default '',                            -- prefilled "Bought a 3 BHK in Gomti Nagar"
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '60 days',
  submitted_at  timestamptz,
  testimonial_id bigint references testimonials (id) on delete set null
);

create index if not exists review_requests_lead_idx on review_requests (lead_id);

alter table review_requests enable row level security;

-- Staff manage links; the public form goes through the service role (token check on the server).
drop policy if exists "staff read review requests" on review_requests;
create policy "staff read review requests" on review_requests for select using (is_staff());
drop policy if exists "staff create review requests" on review_requests;
create policy "staff create review requests" on review_requests for insert with check (is_staff());

-- Where a review came from, so customer reviews can be moderated and badged.
alter table testimonials add column if not exists source text not null default 'admin' check (source in ('admin', 'customer'));
alter table testimonials add column if not exists verified_buyer boolean not null default false;
alter table testimonials add column if not exists lead_id uuid references leads (id) on delete set null;
alter table testimonials add column if not exists property_id text references properties (id) on delete set null;
alter table testimonials add column if not exists city text not null default '';
alter table testimonials add column if not exists consent boolean not null default true;  -- ok to show publicly
