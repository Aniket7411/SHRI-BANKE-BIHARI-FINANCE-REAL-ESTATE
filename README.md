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

## Where to change things

- **Fonts (global):** `lib/fonts.ts`
- **Colours / themes:** `app/globals.css` (Ivory & Gold, Emerald, Midnight)
- **Business details (phone, WhatsApp, address, rates):** `lib/site.ts` — placeholders are marked `TODO`
- **Static data:** `lib/data/*` (properties, loans, testimonials, FAQs)

## Making it dynamic (CRM / admin)

- All pages read data through `lib/api.ts`. Replace those functions with API calls.
- Every form submits through `submitLead()` in `lib/leads.ts`. Point it at the CRM endpoint.
- Shared data shapes live in `lib/types.ts`.
