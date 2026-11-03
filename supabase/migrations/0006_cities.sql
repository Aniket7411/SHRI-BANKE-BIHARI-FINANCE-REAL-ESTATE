-- =============================================================================
-- Cities: the business now covers Kanpur and Lucknow, with more to come.
-- Each listing gets a city; visitors pick a city and the site shows its listings.
-- Admins add cities (with suggested localities) in Admin → Cities, or straight
-- from the property form. Idempotent — safe to run more than once.
-- =============================================================================

create table if not exists cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  localities  text[] not null default '{}',   -- suggestions for the property form and site filters
  active      boolean not null default true,  -- hidden cities drop out of the visitor's city picker
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists cities_updated on cities;
create trigger cities_updated before update on cities for each row execute function set_updated_at();

alter table cities enable row level security;

drop policy if exists "public read cities" on cities;
create policy "public read cities" on cities for select using (active or is_staff());
drop policy if exists "admin write cities" on cities;
create policy "admin write cities" on cities for all using (is_admin()) with check (is_admin());

insert into cities (name, localities, sort_order) values
  ('Kanpur', array['Swaroop Nagar','Civil Lines','Kalyanpur','Kakadeo','Panki','Mall Road','Tilak Nagar','Azad Nagar','Govind Nagar','GT Road','Kidwai Nagar','Barra','Shyam Nagar'], 0),
  ('Lucknow', array['Gomti Nagar','Hazratganj','Indira Nagar','Aliganj','Jankipuram','Aashiana','Sushant Golf City','Vibhuti Khand','Mahanagar','Alambagh'], 1)
on conflict (name) do nothing;

-- Existing listings were all in Kanpur.
alter table properties add column if not exists city text not null default 'Kanpur';
create index if not exists properties_city_idx on properties (city);
