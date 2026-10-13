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

## Backend: Supabase + Gmail

Without `.env.local` the site runs on the demo data in `lib/data/*` and logs leads to the console.

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql` (tables, security rules, storage buckets).
3. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up" (staff are invited by the admin).
4. **Authentication → Users → Add user** → create the owner's login. The first user becomes **admin**; later users are **agents**.
5. Copy `.env.example` to `.env.local` and fill in the URL, anon key and service-role key (Project Settings → API).
6. `npm run db:seed` imports the current properties, loans, testimonials, FAQs, jobs and settings.

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
