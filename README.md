# Shri Banke Bihari — Finance & Real Estate

Website for **Shri Banke Bihari Finance & Real Estate**, Kanpur: property listings plus home, vehicle and property loans.

Built with Next.js 16 (App Router, Cache Components), Tailwind CSS v4, Motion and lucide icons.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Pages

| Route | What it does |
|---|---|
| `/` | Home: hero search, stats, services, featured listings, rates, testimonials |
| `/properties` | Listings with search, filters (shareable URL), sort, saved homes, quick view |
| `/properties/[id]` | Full property page: gallery, specs, EMI estimate, visit booking, similar homes |
| `/loans` | Loan products, EMI calculator, eligibility checker, FAQs, apply form |
| `/contact` | Contact channels, map, enquiry form, callback slot picker |
| `/careers` | Open jobs and application form with resume upload |

## Where to change things

- **Fonts (global):** `lib/fonts.ts`
- **Colours / themes:** `app/globals.css` (Ivory & Gold, Emerald, Midnight)
- **Business details (phone, WhatsApp, address, socials):** Admin → Settings (defaults in `lib/site.ts`)
- **Rates:** Admin → Loans & rates
- **Static data:** `lib/data/*` (properties, loans, testimonials, FAQs)

## Going live

The site has no built-in sample content: every listing, loan, review, FAQ, job, offer and document comes from the admin panel.

**Without Supabase keys** the Supabase clients fall back to an empty local database (`lib/demo/db.ts`, saved to `.demo-db.json`, git-ignored). It has no logins, so the admin panel can't be used until Supabase is connected — always set the Supabase env vars on the server.

Sections with no data (featured listings, reviews, FAQs, rates…) hide themselves.

### Deployment checklist

1. **Supabase project** — create one at supabase.com (free tier is fine).
2. **Run the migrations in order** in SQL Editor: `0001_init.sql` → `0002_crm.sql` → `0003_cms.sql` → `0004_property_details.sql` → `0005_reels.sql` → `0006_cities.sql` → `0007_reviews.sql`.
3. **Auth** — turn off public sign-ups; create the owner under Authentication → Users (the first user becomes admin).
4. **Env vars** — copy `.env.example` → `.env.local` (and to your host): Supabase URL, anon key, service-role key, `NEXT_PUBLIC_SITE_URL`.
5. **Gmail app password** — `SMTP_USER`, `SMTP_PASS` (App passwords), `LEAD_NOTIFY_TO`.
6. **Content** — add listings, loans, reviews and FAQs in the admin.
7. **Hosting** — Hostinger Node.js app or VPS (see `HOSTINGER.md`), Vercel, or any Node host, with the same env vars.
8. **Keep-alive** — free Supabase projects pause after ~7 idle days. `GET /api/health` does a tiny read; `vercel.json` pings it every 3 days on Vercel, and `.github/workflows/keepalive.yml` does the same from GitHub Actions (add repo secret `SITE_URL=https://your-domain.com`).

## Backend: Supabase + Gmail

Without Supabase keys the app runs on the empty local fallback described above.

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql` (tables, security rules, storage buckets).
3. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up" (staff are invited by the admin).
4. **Authentication → Users → Add user** → create the owner's login. The first user becomes **admin**; later users are **agents**.
5. Copy `.env.example` to `.env.local` and fill in the URL, anon key and service-role key (Project Settings → API).

### 2. Gmail SMTP
1. Turn on 2-Step Verification for the Gmail account.
2. Google Account → Security → **App passwords** → create one, paste it into `SMTP_PASS`.
3. Set `LEAD_NOTIFY_TO` to whoever should get new-lead and job-application alerts.

### 3. Vercel
Add the same variables under Project → Settings → Environment Variables, and set `NEXT_PUBLIC_SITE_URL` to the live domain.

## Admin panel (`/admin`)

| Section | Who | What |
|---|---|---|
| Dashboard | everyone | Lead counts, latest leads, follow-ups due |
| Properties | admin | Add / edit / duplicate / delete listings, photo & video upload (auto-compressed to WebP), featured, status |
| Loans & rates | admin | Change a rate once, it updates the whole site |
| Reviews & FAQs | admin | Homepage testimonials, FAQ answers |
| Careers | admin | Post jobs, review applications, download resumes |
| Team | admin | Create agent/admin logins (emailed), reset passwords, remove access |
| Settings | admin | Phone, WhatsApp, email, address, socials, homepage numbers |
| My account | everyone | Name, phone, password |

Code: pages in `app/admin/(panel)/*`, each with an `actions.ts` of Server Actions. Every action re-checks the user (`lib/admin/auth.ts`) and Supabase RLS enforces it again in the database. Saving calls `updateTag()` so the public site refreshes immediately. `proxy.ts` keeps the login session fresh and redirects signed-out visitors.

## How data flows

- **Reads:** pages call `lib/api.ts` → Supabase (cached with tags from `lib/cache-tags.ts`; admin edits revalidate them).
- **Leads:** every form → `submitLead()` → `POST /api/leads` → `lib/crm.ts` (validate, merge repeat phone numbers, timeline entry) → email alert to the team + thank-you email to the customer. UTM / fbclid from the landing URL are stored on the lead.
- **Careers:** `/careers` → `POST /api/careers/apply` → resume stored in the private `resumes` bucket + emailed to the team.
- **Newsletter:** footer → `POST /api/subscribe` → `subscribers` table.
- Shared data shapes live in `lib/types.ts`; database schema in `supabase/migrations/`.
