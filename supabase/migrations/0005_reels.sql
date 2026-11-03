-- =============================================================================
-- Reels: quick Instagram reel / YouTube Short links the admin adds on their own
-- (separate from a listing's video tour). Shown site-wide in the floating
-- "Reels" viewer and in the homepage reels rail. Idempotent.
-- =============================================================================

create table if not exists reels (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  url         text not null,                                        -- Instagram reel / YouTube link
  cover       text not null default '',                             -- optional poster image URL
  property_id text references properties (id) on delete set null,   -- optional "View property" link (properties.id is a slug)
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reels_active_idx on reels (active, sort_order);

drop trigger if exists reels_updated on reels;
create trigger reels_updated before update on reels for each row execute function set_updated_at();

alter table reels enable row level security;

drop policy if exists "public read reels" on reels;
create policy "public read reels" on reels for select using (active or is_staff());
drop policy if exists "admin write reels" on reels;
create policy "admin write reels" on reels for all using (is_admin()) with check (is_admin());
