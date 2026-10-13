-- =============================================================================
-- Shri Banke Bihari — CRM & CMS schema
-- Run once in Supabase → SQL Editor (or `supabase db push`).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type app_role        as enum ('admin', 'agent');
create type property_type   as enum ('Apartment', 'Villa', 'House', 'Plot', 'Commercial');
create type property_purpose as enum ('Buy', 'Rent');
create type listing_status  as enum ('draft', 'published', 'sold', 'rented');
create type lead_status     as enum ('new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'won', 'lost');
create type lead_channel    as enum ('website', 'meta', 'whatsapp', 'manual', 'import');
create type job_status      as enum ('open', 'closed');
create type application_status as enum ('new', 'shortlisted', 'interview', 'hired', 'rejected');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Staff profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  email      text not null default '',
  phone      text,
  role       app_role not null default 'agent',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin');
$$;

-- New auth user → profile. The very first user becomes admin; everyone after is an agent.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when exists (select 1 from profiles where role = 'admin') then 'agent'::app_role else 'admin'::app_role end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Content: properties, loans, testimonials, FAQs, settings
-- ---------------------------------------------------------------------------
create table properties (
  id          text primary key,                      -- URL slug, e.g. "swaroop-nagar-3bhk"
  title       text not null,
  type        property_type not null,
  purpose     property_purpose not null,
  locality    text not null,
  price       numeric(14, 2) not null check (price >= 0),
  beds        smallint,
  baths       smallint,
  area        integer not null check (area > 0),     -- sq.ft
  images      text[] not null default '{}',
  videos      text[] not null default '{}',
  tags        text[] not null default '{}',
  amenities   text[] not null default '{}',
  description text not null default '',
  featured    boolean not null default false,
  verified    boolean not null default false,
  status      listing_status not null default 'published',
  sort_order  integer not null default 0,
  views       integer not null default 0,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index properties_status_idx on properties (status, sort_order);
create trigger properties_updated before update on properties for each row execute function set_updated_at();

create table loan_products (
  id                text primary key,                -- "home", "vehicle", …
  name              text not null,
  short             text not null default '',
  icon              text not null default 'home',
  rate              numeric(5, 2) not null,          -- starting % p.a.
  max_tenure_years  smallint not null,
  max_amount        text not null default '',
  processing        text not null default '',
  highlights        text[] not null default '{}',
  eligibility       text[] not null default '{}',
  documents         text[] not null default '{}',
  image             text not null default '',
  sort_order        integer not null default 0,
  active            boolean not null default true,
  updated_at        timestamptz not null default now()
);
create trigger loan_products_updated before update on loan_products for each row execute function set_updated_at();

create table testimonials (
  id         bigint generated always as identity primary key,
  name       text not null,
  role       text not null default '',
  quote      text not null,
  avatar     text not null default '',
  rating     smallint not null default 5 check (rating between 1 and 5),
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table faqs (
  id         bigint generated always as identity primary key,
  q          text not null,
  a          text not null,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Single-row key/value store for phone, address, socials, stats, etc.
create table site_settings (
  id         smallint primary key default 1 check (id = 1),
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated before update on site_settings for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Careers
-- ---------------------------------------------------------------------------
create table jobs (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  department      text not null default '',
  location        text not null default 'Kanpur',
  employment_type text not null default 'Full-time',
  experience      text not null default '',
  salary          text not null default '',
  description     text not null default '',
  responsibilities text[] not null default '{}',
  requirements    text[] not null default '{}',
  status          job_status not null default 'open',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger jobs_updated before update on jobs for each row execute function set_updated_at();

create table job_applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references jobs (id) on delete set null,
  job_title   text not null default '',               -- snapshot, survives job deletion
  name        text not null,
  phone       text not null,
  email       text,
  experience  text,
  message     text,
  resume_path text,                                   -- object path in the private "resumes" bucket
  status      application_status not null default 'new',
  notes       text,
  created_at  timestamptz not null default now()
);
create index job_applications_job_idx on job_applications (job_id, created_at desc);

-- ---------------------------------------------------------------------------
-- CRM: leads + activity timeline
-- ---------------------------------------------------------------------------
create table leads (
  id               uuid primary key default gen_random_uuid(),
  ref              bigint generated always as identity (start with 1001) unique,  -- shown as L-1001
  name             text not null,
  phone            text not null,
  phone_norm       text not null,                    -- last 10 digits, used for de-duplication
  email            text,
  interest         text not null default 'Other',
  budget           text,
  message          text,
  callback_slot    text,
  source           text not null default 'website',  -- form / page / campaign that produced it
  channel          lead_channel not null default 'website',
  property_id      text references properties (id) on delete set null,
  status           lead_status not null default 'new',
  assigned_to      uuid references profiles (id) on delete set null,
  follow_up_at     timestamptz,
  utm              jsonb not null default '{}',      -- utm_source, utm_campaign, … from the landing URL
  meta             jsonb not null default '{}',      -- Meta lead-ad ids: leadgen_id, campaign, ad set, ad, form
  submissions      integer not null default 1,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index leads_phone_idx    on leads (phone_norm);
create index leads_status_idx   on leads (status, created_at desc);
create index leads_assigned_idx on leads (assigned_to, created_at desc);
create index leads_followup_idx on leads (follow_up_at) where follow_up_at is not null;
create unique index leads_meta_leadgen_idx on leads ((meta ->> 'leadgen_id')) where meta ? 'leadgen_id';
create trigger leads_updated before update on leads for each row execute function set_updated_at();

create table lead_activities (
  id         bigint generated always as identity primary key,
  lead_id    uuid not null references leads (id) on delete cascade,
  actor      uuid references profiles (id) on delete set null,   -- null = system
  kind       text not null,                                       -- created | resubmitted | note | status | assigned | email | call
  body       text,
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx on lead_activities (lead_id, created_at desc);

-- Newsletter subscribers (footer form)
create table subscribers (
  email      text primary key,
  source     text not null default 'footer',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public site uses the anon key (read published content only).
-- Lead / application inserts go through server routes using the service role.
-- ---------------------------------------------------------------------------
alter table profiles         enable row level security;
alter table properties       enable row level security;
alter table loan_products    enable row level security;
alter table testimonials     enable row level security;
alter table faqs             enable row level security;
alter table site_settings    enable row level security;
alter table jobs             enable row level security;
alter table job_applications enable row level security;
alter table leads            enable row level security;
alter table lead_activities  enable row level security;
alter table subscribers      enable row level security;

-- profiles
create policy "staff read profiles"  on profiles for select using (is_staff());
create policy "admin manage profiles" on profiles for all using (is_admin()) with check (is_admin());

-- public content
create policy "public read properties" on properties for select using (status <> 'draft' or is_staff());
create policy "admin write properties" on properties for all using (is_admin()) with check (is_admin());

create policy "public read loans" on loan_products for select using (active or is_staff());
create policy "admin write loans" on loan_products for all using (is_admin()) with check (is_admin());

create policy "public read testimonials" on testimonials for select using (active or is_staff());
create policy "admin write testimonials" on testimonials for all using (is_admin()) with check (is_admin());

create policy "public read faqs" on faqs for select using (active or is_staff());
create policy "admin write faqs" on faqs for all using (is_admin()) with check (is_admin());

create policy "public read settings" on site_settings for select using (true);
create policy "admin write settings" on site_settings for all using (is_admin()) with check (is_admin());

create policy "public read jobs" on jobs for select using (status = 'open' or is_staff());
create policy "admin write jobs" on jobs for all using (is_admin()) with check (is_admin());

-- careers applications: admin only
create policy "admin manage applications" on job_applications for all using (is_admin()) with check (is_admin());

-- leads: admins see all, agents see only theirs
create policy "admin manage leads" on leads for all using (is_admin()) with check (is_admin());
create policy "agent read own leads" on leads for select using (is_staff() and assigned_to = auth.uid());
create policy "agent update own leads" on leads for update
  using (is_staff() and assigned_to = auth.uid())
  with check (is_staff() and assigned_to = auth.uid());

create policy "admin manage activities" on lead_activities for all using (is_admin()) with check (is_admin());
create policy "agent read own activities" on lead_activities for select
  using (exists (select 1 from leads l where l.id = lead_id and l.assigned_to = auth.uid()) and is_staff());
create policy "agent add own activities" on lead_activities for insert
  with check (exists (select 1 from leads l where l.id = lead_id and l.assigned_to = auth.uid()) and is_staff() and actor = auth.uid());

create policy "admin manage subscribers" on subscribers for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public "media" (property images/videos), private "resumes"
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)            -- 50 MB (videos)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
        array['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "public read media"  on storage.objects for select using (bucket_id = 'media');
create policy "admin upload media" on storage.objects for insert with check (bucket_id = 'media' and is_admin());
create policy "admin update media" on storage.objects for update using (bucket_id = 'media' and is_admin());
create policy "admin delete media" on storage.objects for delete using (bucket_id = 'media' and is_admin());

create policy "admin read resumes" on storage.objects for select using (bucket_id = 'resumes' and is_admin());
