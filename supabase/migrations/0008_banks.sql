-- =============================================================================
-- Banks & bank-wise rates.
-- The admin adds partner banks (name, type, logo) and keeps each bank's current
-- rate per loan product. The website compares them, lowest first, and a loan's
-- "from x%" headline becomes the lowest active bank rate automatically
-- (loan_products.rate stays as the fallback when no bank rate is entered).
-- Also adds the Education loan and OD/CC limit products.
-- Idempotent — safe to run more than once.
-- =============================================================================

create table if not exists banks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  kind        text not null default 'Government' check (kind in ('Government', 'Private', 'NBFC', 'Housing finance')),
  logo        text not null default '',               -- public "media" bucket URL; empty = initials badge
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists banks_updated on banks;
create trigger banks_updated before update on banks for each row execute function set_updated_at();

create table if not exists bank_rates (
  id          uuid primary key default gen_random_uuid(),
  bank_id     uuid not null references banks (id) on delete cascade,
  loan_id     text not null references loan_products (id) on delete cascade on update cascade,
  rate_min    numeric(5, 2) not null check (rate_min > 0 and rate_min < 40),   -- % p.a.
  rate_max    numeric(5, 2) check (rate_max is null or (rate_max >= rate_min and rate_max < 40)),
  processing  text not null default '',                -- e.g. "0.35% + GST" / "Nil"
  note        text not null default '',                -- e.g. "Women borrowers: 0.05% lower"
  updated_at  timestamptz not null default now(),
  unique (bank_id, loan_id)
);

create index if not exists bank_rates_loan_idx on bank_rates (loan_id, rate_min);

drop trigger if exists bank_rates_updated on bank_rates;
create trigger bank_rates_updated before update on bank_rates for each row execute function set_updated_at();

alter table banks      enable row level security;
alter table bank_rates enable row level security;

drop policy if exists "public read banks" on banks;
create policy "public read banks" on banks for select using (active or is_staff());
drop policy if exists "admin write banks" on banks;
create policy "admin write banks" on banks for all using (is_admin()) with check (is_admin());

-- Rates of hidden banks stay private.
drop policy if exists "public read bank rates" on bank_rates;
create policy "public read bank rates" on bank_rates for select
  using (is_staff() or exists (select 1 from banks b where b.id = bank_id and b.active));
drop policy if exists "admin write bank rates" on bank_rates;
create policy "admin write bank rates" on bank_rates for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- New loan products from the business profile: Education loan, OD/CC limit.
-- ---------------------------------------------------------------------------
insert into loan_products (id, name, short, icon, rate, max_tenure_years, max_amount, processing, highlights, eligibility, documents, sort_order) values
  ('education', 'Education Loan', 'Study in India or abroad — tuition, hostel, travel and laptop covered.', 'graduation', 8.15, 15, '₹1.5 Cr', 'As per bank',
    array['Covers tuition, hostel, books, travel and laptop', 'Repay after the course + moratorium', 'Tax benefit on interest under Section 80E', 'Collateral-free up to ₹7.5 lakh (government banks)'],
    array['Indian student with confirmed admission', 'Co-applicant: parent or guardian', 'Recognised course in India or abroad'],
    array['Admission letter & fee structure', 'Mark sheets (10th, 12th, graduation)', 'KYC of student and co-applicant', 'Co-applicant income proof'],
    10),
  ('odcc', 'OD / CC Limit', 'Overdraft and cash-credit limits for traders and businesses from government banks.', 'landmark', 9.25, 1, 'As per turnover', 'As per bank',
    array['Pay interest only on the amount you use', 'Renewable every year', 'Against property, stock or book debts', 'Mudra / CGTMSE options for small units'],
    array['Business running 2+ years', 'GST registration and ITRs', 'Collateral or eligible government-scheme cover'],
    array['KYC of firm and partners / directors', 'Last 2 years ITR & balance sheet', '12 months bank statement', 'GST returns', 'Property papers (if collateral)'],
    11)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Starting list of partner banks (no rates yet — add them in Admin → Bank rates).
-- ---------------------------------------------------------------------------
insert into banks (name, kind, sort_order) values
  ('State Bank of India', 'Government', 0),
  ('Bank of Baroda', 'Government', 1),
  ('Punjab National Bank', 'Government', 2),
  ('Canara Bank', 'Government', 3),
  ('Union Bank of India', 'Government', 4),
  ('Bank of India', 'Government', 5),
  ('Indian Bank', 'Government', 6),
  ('Central Bank of India', 'Government', 7),
  ('Bank of Maharashtra', 'Government', 8),
  ('UCO Bank', 'Government', 9),
  ('HDFC Bank', 'Private', 10),
  ('ICICI Bank', 'Private', 11),
  ('Axis Bank', 'Private', 12)
on conflict (name) do nothing;
