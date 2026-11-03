-- =============================================================================
-- CMS additions: offers & coupons, firm documents, testimonial reels,
-- and a tighter 5 MB limit on the public "media" bucket.
-- Idempotent — safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Offers & coupons (Diwali, New Year, …)
-- ---------------------------------------------------------------------------
create table if not exists offers (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null default '',
  code          text,                                  -- optional coupon code
  discount_text text not null default '',              -- e.g. 'Zero processing fee'
  applies_to    text not null default 'All',           -- e.g. 'Home loan' / 'All'
  starts_at     timestamptz,                           -- null = starts immediately
  ends_at       timestamptz,                           -- null = no end date
  show_banner   boolean not null default false,        -- slim bar at the top of the site
  show_popup    boolean not null default false,        -- once-per-visitor popup
  cta_label     text not null default 'Claim offer',
  cta_href      text not null default '/contact',
  theme         text not null default 'default' check (theme in ('diwali', 'gold', 'default')),
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint offers_dates_valid check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists offers_active_idx on offers (active, sort_order);

drop trigger if exists offers_updated on offers;
create trigger offers_updated before update on offers for each row execute function set_updated_at();

alter table offers enable row level security;

drop policy if exists "public read offers" on offers;
create policy "public read offers" on offers for select using (active or is_staff());
drop policy if exists "admin write offers" on offers;
create policy "admin write offers" on offers for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Documents: RERA, GST, registration, bank partner letters…
-- file_url is a public "media" bucket URL (pdf / image) or any external link (Google Drive…).
-- ---------------------------------------------------------------------------
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null default 'Certificate',
  file_url    text not null,
  file_kind   text not null default 'link' check (file_kind in ('pdf', 'image', 'link')),
  size_bytes  bigint,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_active_idx on documents (active, sort_order);

drop trigger if exists documents_updated on documents;
create trigger documents_updated before update on documents for each row execute function set_updated_at();

alter table documents enable row level security;

drop policy if exists "public read documents" on documents;
create policy "public read documents" on documents for select using (active or is_staff());
drop policy if exists "admin write documents" on documents;
create policy "admin write documents" on documents for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Testimonials: optional Instagram reel / YouTube video review
-- ---------------------------------------------------------------------------
alter table testimonials add column if not exists reel_url text not null default '';

-- ---------------------------------------------------------------------------
-- Storage: videos are now Instagram / YouTube links, so cap uploads at 5 MB
-- ---------------------------------------------------------------------------
update storage.buckets set file_size_limit = 5242880 where id = 'media';  -- 5 MB
