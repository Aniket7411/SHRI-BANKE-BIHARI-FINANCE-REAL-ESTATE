/**
 * Data access layer.
 * Every page reads data ONLY through these functions. They read live data from
 * Supabase (cached, tagged with `TAGS.*` so admin edits show up immediately) and
 * fall back to the static demo data in `lib/data/*` until Supabase is configured.
 */
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabasePublic } from "@/lib/supabase/public";
import { properties as demoProperties, localities as serviceAreas } from "@/lib/data/properties";
import { loanProducts as demoLoans } from "@/lib/data/loans";
import { faqs as demoFaqs, testimonials as demoTestimonials } from "@/lib/data/content";
import { jobs as demoJobs } from "@/lib/data/jobs";
import { defaultSettings, type SiteSettings } from "@/lib/site";
import type { Faq, Job, LoanProduct, Property, Testimonial } from "@/lib/types";

/* ---------------------------------------------------------------- row mappers */

type Row = Record<string, unknown>;

const toProperty = (r: Row): Property => ({
  id: r.id as string,
  title: r.title as string,
  type: r.type as Property["type"],
  purpose: r.purpose as Property["purpose"],
  locality: r.locality as string,
  price: Number(r.price),
  beds: (r.beds as number | null) ?? undefined,
  baths: (r.baths as number | null) ?? undefined,
  area: r.area as number,
  images: (r.images as string[]) ?? [],
  videos: (r.videos as string[]) ?? [],
  tags: (r.tags as string[]) ?? [],
  featured: Boolean(r.featured),
  verified: Boolean(r.verified),
  description: (r.description as string) ?? "",
  amenities: (r.amenities as string[]) ?? [],
});

const toLoan = (r: Row): LoanProduct => ({
  id: r.id as string,
  name: r.name as string,
  short: r.short as string,
  icon: r.icon as LoanProduct["icon"],
  rate: Number(r.rate),
  maxTenureYears: r.max_tenure_years as number,
  maxAmount: r.max_amount as string,
  processing: r.processing as string,
  highlights: (r.highlights as string[]) ?? [],
  eligibility: (r.eligibility as string[]) ?? [],
  documents: (r.documents as string[]) ?? [],
  image: r.image as string,
});

const toJob = (r: Row): Job => ({
  id: r.id as string,
  slug: r.slug as string,
  title: r.title as string,
  department: r.department as string,
  location: r.location as string,
  employmentType: r.employment_type as string,
  experience: r.experience as string,
  salary: r.salary as string,
  description: r.description as string,
  responsibilities: (r.responsibilities as string[]) ?? [],
  requirements: (r.requirements as string[]) ?? [],
  postedAt: r.created_at as string,
});

/** Run a query, log failures and return a safe empty value instead of crashing the page. */
async function query<T>(label: string, run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (d: unknown) => T, empty: T): Promise<T> {
  const { data, error } = await run();
  if (error) {
    console.error(`[api] ${label}: ${error.message}`);
    return empty;
  }
  return map(data);
}

/* ---------------------------------------------------------------- properties */

/** All published listings, admin-defined order first, newest next. */
export async function getProperties(): Promise<Property[]> {
  "use cache";
  cacheTag(TAGS.properties);
  cacheLife("hours");
  if (!isSupabaseConfigured) return demoProperties;
  return query(
    "getProperties",
    () => supabasePublic().from("properties").select("*").eq("status", "published").order("sort_order").order("created_at", { ascending: false }),
    (d) => (d as Row[]).map(toProperty),
    [],
  );
}

export async function getFeaturedProperties() {
  return (await getProperties()).filter((p) => p.featured);
}

/** A single listing (published, sold or rented — drafts are hidden by RLS). */
export async function getPropertyById(id: string): Promise<Property | null> {
  "use cache";
  cacheTag(TAGS.properties, TAGS.property(id));
  cacheLife("hours");
  if (!isSupabaseConfigured) return demoProperties.find((p) => p.id === id) ?? null;
  return query(
    "getPropertyById",
    () => supabasePublic().from("properties").select("*").eq("id", id).neq("status", "draft").maybeSingle(),
    (d) => (d ? toProperty(d as Row) : null),
    null,
  );
}

/** Same type or locality, excluding the current listing. */
export async function getSimilarProperties(id: string, limit = 3) {
  const all = await getProperties();
  const base = all.find((p) => p.id === id) ?? (await getPropertyById(id));
  if (!base) return [];
  return all
    .filter((p) => p.id !== id && (p.type === base.type || p.locality === base.locality || p.purpose === base.purpose))
    .slice(0, limit);
}

/** Service areas plus any locality used by a live listing, for search / filter dropdowns. */
export async function getLocalities() {
  return [...new Set([...serviceAreas, ...(await getProperties()).map((p) => p.locality)])];
}

/* ---------------------------------------------------------------- loans */

export async function getLoanProducts(): Promise<LoanProduct[]> {
  "use cache";
  cacheTag(TAGS.loans);
  cacheLife("hours");
  if (!isSupabaseConfigured) return demoLoans;
  return query(
    "getLoanProducts",
    () => supabasePublic().from("loan_products").select("*").eq("active", true).order("sort_order"),
    (d) => (d as Row[]).map(toLoan),
    [],
  );
}

/* ---------------------------------------------------------------- content */

export async function getTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheTag(TAGS.testimonials);
  cacheLife("hours");
  if (!isSupabaseConfigured) return demoTestimonials;
  return query(
    "getTestimonials",
    () => supabasePublic().from("testimonials").select("name, role, quote, avatar, rating").eq("active", true).order("sort_order"),
    (d) => d as Testimonial[],
    [],
  );
}

export async function getFaqs(): Promise<Faq[]> {
  "use cache";
  cacheTag(TAGS.faqs);
  cacheLife("hours");
  if (!isSupabaseConfigured) return demoFaqs;
  return query(
    "getFaqs",
    () => supabasePublic().from("faqs").select("q, a").eq("active", true).order("sort_order"),
    (d) => d as Faq[],
    [],
  );
}

/* ---------------------------------------------------------------- careers */

export async function getJobs(): Promise<Job[]> {
  "use cache";
  cacheTag(TAGS.jobs);
  cacheLife("hours");
  if (!isSupabaseConfigured) return demoJobs;
  return query(
    "getJobs",
    () => supabasePublic().from("jobs").select("*").eq("status", "open").order("sort_order").order("created_at", { ascending: false }),
    (d) => (d as Row[]).map(toJob),
    [],
  );
}

export async function getJobBySlug(slug: string) {
  return (await getJobs()).find((j) => j.slug === slug) ?? null;
}

/* ---------------------------------------------------------------- settings */

const SETTING_KEYS = ["phone", "whatsapp", "email", "address", "hours", "instagram", "instagramHandle", "facebook", "youtube", "stats"] as const;

/** Contact details & stats from Admin → Settings, rates from the loan products. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(TAGS.settings, TAGS.loans);
  cacheLife("hours");
  if (!isSupabaseConfigured) return defaultSettings;
  const db = supabasePublic();
  const [{ data: row, error }, loans] = await Promise.all([db.from("site_settings").select("data").eq("id", 1).maybeSingle(), getLoanProducts()]);
  if (error) console.error(`[api] getSiteSettings: ${error.message}`);
  const saved = (row?.data ?? {}) as Partial<SiteSettings>;
  const merged = { ...defaultSettings };
  for (const k of SETTING_KEYS) if (saved[k] !== undefined && saved[k] !== null) Object.assign(merged, { [k]: saved[k] });
  const rate = (id: string) => loans.find((l) => l.id === id)?.rate;
  merged.rates = { home: rate("home") ?? defaultSettings.rates.home, vehicle: rate("vehicle") ?? defaultSettings.rates.vehicle };
  return merged;
}
