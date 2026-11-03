/**
 * Data access layer.
 * Every page reads data ONLY through these functions.
 *
 * Everything comes from the database (Supabase, or the empty local fallback in
 * lib/demo/db.ts while no Supabase keys are set). Empty collections render nothing.
 *
 * Caching: DB reads are `"use cache"` + `cacheTag(TAGS.*)` so admin edits show up
 * immediately. Request data (draftMode) is read OUTSIDE the cached functions and the
 * resolved mode is passed in as an argument.
 */
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import { TAGS } from "@/lib/cache-tags";
import { supabasePublic } from "@/lib/supabase/public";
import { DEFAULT_CITIES, type City } from "@/lib/cities";
import { loanImage } from "@/lib/data/loans";
import { categoryOf, normalizeType } from "@/lib/property-meta";
import { defaultSettings, type SiteSettings } from "@/lib/site";
import type { Bank, BankOffer, Faq, Job, LoanProduct, Property, Testimonial } from "@/lib/types";

/* ---------------------------------------------------------------- row mappers */

type Row = Record<string, unknown>;

const toProperty = (r: Row): Property => ({
  id: r.id as string,
  title: r.title as string,
  category: (r.category as Property["category"]) ?? categoryOf(normalizeType(r.type as string)),
  type: normalizeType(r.type as string),
  purpose: r.purpose as Property["purpose"],
  city: (r.city as string) || "Kanpur",
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
  details: (r.details as Property["details"]) ?? {},
  createdAt: (r.created_at as string) ?? undefined,
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
  image: loanImage(r.id as string),
});

const toBank = (r: Row): Bank => ({ id: r.id as string, name: r.name as string, kind: (r.kind as Bank["kind"]) ?? "Government", logo: (r.logo as string) ?? "" });

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

/* ---------------------------------------------------------------- website mode */

export type SiteMode = "demo" | "live";

/** True while an admin previews the live site (Draft Mode). Never throws (e.g. at build time). */
export async function isSitePreview() {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
}

/** Raw `site_settings.data` (uncached helper — call from cached functions only). */
async function readSettingsRow(): Promise<Row> {
  const { data, error } = await supabasePublic().from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (error) console.error(`[api] site_settings: ${error.message}`);
  return ((data as { data?: Row } | null)?.data ?? {}) as Row;
}

/** The website is always live: every page shows what's managed in the admin panel. */
export async function getSavedSiteMode(): Promise<SiteMode> {
  return "live";
}

/**
 * Effective mode for this request: "live" while previewing, otherwise the saved mode.
 * Use it in new getters: `const mode = await getSiteMode()` and pass `mode` into the
 * cached function as a cache key (always "live" now).
 */
export async function getSiteMode(): Promise<SiteMode> {
  if (await isSitePreview()) return "live";
  return getSavedSiteMode();
}

/* ---------------------------------------------------------------- properties */

async function cachedProperties(mode: SiteMode): Promise<Property[]> {
  "use cache";
  cacheTag(TAGS.properties);
  cacheLife("hours");
  return query(
    "getProperties",
    () => supabasePublic().from("properties").select("*").eq("status", "published").order("sort_order").order("created_at", { ascending: false }),
    (d) => (d as Row[]).map(toProperty),
    [],
  );
}

/** All published listings, admin-defined order first, newest next. */
export async function getProperties(): Promise<Property[]> {
  return cachedProperties(await getSiteMode());
}

export async function getFeaturedProperties() {
  return (await getProperties()).filter((p) => p.featured);
}

async function cachedPropertyById(mode: SiteMode, id: string): Promise<Property | null> {
  "use cache";
  cacheTag(TAGS.properties, TAGS.property(id));
  cacheLife("hours");
  const listed = (await cachedProperties(mode)).find((p) => p.id === id);
  if (listed) return listed;
  return query(
    "getPropertyById",
    () => supabasePublic().from("properties").select("*").eq("id", id).neq("status", "draft").maybeSingle(),
    (d) => (d ? toProperty(d as Row) : null),
    null,
  );
}

/** A single listing (published, sold or rented — drafts are hidden by RLS). */
export async function getPropertyById(id: string): Promise<Property | null> {
  return cachedPropertyById(await getSiteMode(), id);
}

/** Same city and same type, locality or purpose, excluding the current listing. */
export async function getSimilarProperties(id: string, limit = 3) {
  const all = await getProperties();
  const base = all.find((p) => p.id === id) ?? (await getPropertyById(id));
  if (!base) return [];
  return all
    .filter((p) => p.id !== id && p.city === base.city && (p.type === base.type || p.locality === base.locality || p.purpose === base.purpose))
    .slice(0, limit);
}

async function cachedCities(mode: SiteMode): Promise<City[]> {
  "use cache";
  cacheTag(TAGS.cities, TAGS.properties);
  cacheLife("hours");
  // Cities are business settings (like contact details), so they come from the DB in both modes.
  const [rows, listings] = await Promise.all([
    query("getCities", () => supabasePublic().from("cities").select("name, localities").eq("active", true).order("sort_order").order("name"), (d) => d as Row[], []),
    cachedProperties(mode),
  ]);
  const cities: City[] = rows.length ? rows.map((r) => ({ name: r.name as string, localities: (r.localities as string[]) ?? [] })) : structuredClone(DEFAULT_CITIES);
  // Add any locality a listing uses that isn't in the city's suggestions yet.
  for (const p of listings) {
    const c = cities.find((x) => x.name === p.city);
    if (c && !c.localities.includes(p.locality)) c.localities.push(p.locality);
  }
  return cities;
}

/** Active cities in display order, each with its localities — for the city picker, search and filters. */
export async function getCities(): Promise<City[]> {
  return cachedCities(await getSiteMode());
}

/* ---------------------------------------------------------------- loans */

async function cachedLoans(mode: SiteMode): Promise<LoanProduct[]> {
  "use cache";
  cacheTag(TAGS.loans, TAGS.banks);
  cacheLife("hours");
  // Two queries for every product and every bank rate; RLS already hides hidden banks' rates.
  const [loans, rates] = await Promise.all([
    query("getLoanProducts", () => supabasePublic().from("loan_products").select("*").eq("active", true).order("sort_order"), (d) => (d as Row[]).map(toLoan), []),
    query(
      "getBankRates",
      () => supabasePublic().from("bank_rates").select("loan_id, rate_min, rate_max, processing, note, updated_at, bank:banks(id, name, kind, logo, active)"),
      (d) => d as Row[],
      [],
    ),
  ]);
  const byLoan = new Map<string, BankOffer[]>();
  for (const r of rates) {
    const b = r.bank as Row | null;
    if (!b || b.active === false) continue;
    const offer: BankOffer = {
      bank: toBank(b),
      rateMin: Number(r.rate_min),
      rateMax: r.rate_max === null || r.rate_max === undefined ? null : Number(r.rate_max),
      processing: (r.processing as string) ?? "",
      note: (r.note as string) ?? "",
      updatedAt: r.updated_at as string,
    };
    byLoan.set(r.loan_id as string, [...(byLoan.get(r.loan_id as string) ?? []), offer]);
  }
  return loans.map((l) => {
    const banks = (byLoan.get(l.id) ?? []).sort((a, b) => a.rateMin - b.rateMin || a.bank.name.localeCompare(b.bank.name));
    return banks.length ? { ...l, banks, rate: banks[0].rateMin } : l;
  });
}

export async function getLoanProducts(): Promise<LoanProduct[]> {
  return cachedLoans(await getSiteMode());
}

async function cachedBanks(mode: SiteMode): Promise<Bank[]> {
  "use cache";
  cacheTag(TAGS.banks);
  cacheLife("hours");
  return query("getBanks", () => supabasePublic().from("banks").select("id, name, kind, logo").eq("active", true).order("sort_order").order("name"), (d) => (d as Row[]).map(toBank), []);
}

/** Visible partner banks in admin order (logo strip). */
export async function getBanks(): Promise<Bank[]> {
  return cachedBanks(await getSiteMode());
}

/* ---------------------------------------------------------------- content */

async function cachedTestimonials(mode: SiteMode): Promise<Testimonial[]> {
  "use cache";
  cacheTag(TAGS.testimonials);
  cacheLife("hours");
  return query(
    "getTestimonials",
    () => supabasePublic().from("testimonials").select("*").eq("active", true).order("sort_order"),
    (d) => (d as Row[]).map((r) => ({ name: r.name as string, role: (r.role as string) ?? "", quote: r.quote as string, avatar: (r.avatar as string) ?? "", rating: Number(r.rating) || 5, verifiedBuyer: Boolean(r.verified_buyer) })),
    [],
  );
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return cachedTestimonials(await getSiteMode());
}

async function cachedFaqs(mode: SiteMode): Promise<Faq[]> {
  "use cache";
  cacheTag(TAGS.faqs);
  cacheLife("hours");
  return query(
    "getFaqs",
    () => supabasePublic().from("faqs").select("q, a").eq("active", true).order("sort_order"),
    (d) => d as Faq[],
    [],
  );
}

export async function getFaqs(): Promise<Faq[]> {
  return cachedFaqs(await getSiteMode());
}

/* ---------------------------------------------------------------- careers */

async function cachedJobs(mode: SiteMode): Promise<Job[]> {
  "use cache";
  cacheTag(TAGS.jobs);
  cacheLife("hours");
  return query(
    "getJobs",
    () => supabasePublic().from("jobs").select("*").eq("status", "open").order("sort_order").order("created_at", { ascending: false }),
    (d) => (d as Row[]).map(toJob),
    [],
  );
}

export async function getJobs(): Promise<Job[]> {
  return cachedJobs(await getSiteMode());
}

export async function getJobBySlug(slug: string) {
  return (await getJobs()).find((j) => j.slug === slug) ?? null;
}

/* ---------------------------------------------------------------- settings */

const SETTING_KEYS = ["phone", "phone2", "whatsapp", "email", "address", "hours", "instagram", "instagramHandle", "facebook", "youtube", "stats"] as const;

async function cachedSettings(mode: SiteMode): Promise<SiteSettings> {
  "use cache";
  cacheTag(TAGS.settings, TAGS.loans);
  cacheLife("hours");
  // Contact details are business settings, not demo content — always read them from the DB.
  const [saved, loans] = await Promise.all([readSettingsRow() as Promise<Partial<SiteSettings>>, cachedLoans(mode)]);
  const merged = { ...defaultSettings };
  for (const k of SETTING_KEYS) if (saved[k] !== undefined && saved[k] !== null) Object.assign(merged, { [k]: saved[k] });
  const rate = (id: string) => loans.find((l) => l.id === id)?.rate;
  merged.rates = { home: rate("home") ?? defaultSettings.rates.home, vehicle: rate("vehicle") ?? defaultSettings.rates.vehicle };
  return merged;
}

/** Contact details & stats from Admin → Settings, rates from the loan products. */
export async function getSiteSettings(): Promise<SiteSettings> {
  return cachedSettings(await getSiteMode());
}

/* ---------------------------------------------------------------- offers, documents & reels (CMS) */
// Appended section — kept self-contained so it merges cleanly with the code above.
import type { Offer, SiteDocument, TestimonialReel } from "@/lib/types";

const toOffer = (r: Row): Offer => ({
  id: String(r.id),
  title: (r.title as string) ?? "",
  description: (r.description as string) ?? "",
  code: (r.code as string | null) || null,
  discountText: (r.discount_text as string) ?? "",
  appliesTo: (r.applies_to as string) ?? "All",
  startsAt: (r.starts_at as string | null) ?? null,
  endsAt: (r.ends_at as string | null) ?? null,
  showBanner: Boolean(r.show_banner),
  showPopup: Boolean(r.show_popup),
  ctaLabel: (r.cta_label as string) ?? "",
  ctaHref: (r.cta_href as string) ?? "",
  theme: (["diwali", "gold", "default"].includes(r.theme as string) ? r.theme : "default") as Offer["theme"],
});

const toDocument = (r: Row): SiteDocument => ({
  id: String(r.id),
  title: r.title as string,
  category: (r.category as string) ?? "",
  fileUrl: r.file_url as string,
  fileKind: (["pdf", "image", "link"].includes(r.file_kind as string) ? r.file_kind : "link") as SiteDocument["fileKind"],
  sizeBytes: (r.size_bytes as number | null) ?? null,
});

async function cachedOffers(mode: SiteMode): Promise<Offer[]> {
  "use cache";
  cacheTag(TAGS.offers);
  cacheLife("hours");
  return query(
    "getActiveOffers",
    () => supabasePublic().from("offers").select("*").eq("active", true).order("sort_order").order("created_at", { ascending: false }),
    (d) => (d as Row[]).map(toOffer),
    [],
  );
}

/**
 * Active offers in display order. The start/end window is evaluated in the browser
 * (components/offers/*) so cached pages never show an offer outside its dates.
 */
export async function getActiveOffers(): Promise<Offer[]> {
  return cachedOffers(await getSiteMode());
}

async function cachedDocuments(mode: SiteMode): Promise<SiteDocument[]> {
  "use cache";
  cacheTag(TAGS.documents);
  cacheLife("hours");
  return query(
    "getDocuments",
    () => supabasePublic().from("documents").select("*").eq("active", true).order("sort_order").order("created_at"),
    (d) => (d as Row[]).map(toDocument),
    [],
  );
}

/** Visible firm documents (certificates, registrations, partner letters) for the strip above the footer. */
export async function getDocuments(): Promise<SiteDocument[]> {
  return cachedDocuments(await getSiteMode());
}

async function cachedTestimonialReels(mode: SiteMode): Promise<TestimonialReel[]> {
  "use cache";
  cacheTag(TAGS.testimonials);
  cacheLife("hours");
  return query(
    "getTestimonialReels",
    () => supabasePublic().from("testimonials").select("name, role, reel_url").eq("active", true).neq("reel_url", "").order("sort_order"),
    (d) => (d as Row[]).filter((r) => r.reel_url).map((r) => ({ name: r.name as string, role: (r.role as string) ?? "", reelUrl: r.reel_url as string })),
    [],
  );
}

/** Customer video reviews (Instagram reels / YouTube) attached to active testimonials. */
export async function getTestimonialReels(): Promise<TestimonialReel[]> {
  return cachedTestimonialReels(await getSiteMode());
}

/* ---------------------------------------------------------------- reels (site-wide viewer) */
import { videoInfo } from "@/lib/video";
import type { Reel } from "@/lib/types";

async function cachedReels(mode: SiteMode): Promise<Reel[]> {
  "use cache";
  cacheTag(TAGS.reels, TAGS.properties);
  cacheLife("hours");
  // Quick reels are real links the admin pasted, so (like contact details) they're read from the DB in both modes.
  const [rows, listings] = await Promise.all([
    query("getReels", () => supabasePublic().from("reels").select("*").eq("active", true).order("sort_order").order("created_at"), (d) => d as Row[], []),
    cachedProperties(mode),
  ]);
  const listed = new Set(listings.map((p) => p.id));
  const linkedIds = [...new Set(rows.map((r) => r.property_id as string | null).filter((id): id is string => !!id && !listed.has(id)))];
  const linked = linkedIds.length
    ? await query("getReels:properties", () => supabasePublic().from("properties").select("*").in("id", linkedIds), (d) => (d as Row[]).map(toProperty), [])
    : [];
  const byId = new Map([...listings, ...linked].map((p) => [p.id, p]));
  const card = (p: Property | undefined): Reel["property"] => (p ? { id: p.id, title: p.title, city: p.city, locality: p.locality, price: p.price, purpose: p.purpose } : null);

  const reels: Reel[] = rows.map((r) => {
    const p = byId.get(r.property_id as string);
    return { id: String(r.id), title: r.title as string, url: r.url as string, cover: (r.cover as string) || p?.images[0] || videoInfo(r.url as string)?.thumb, property: card(p) };
  });
  // Then the vertical videos attached to listings (property form → "Video links").
  const seen = new Set(reels.map((r) => videoInfo(r.url)?.id));
  for (const p of listings) {
    for (const url of p.videos ?? []) {
      const info = videoInfo(url);
      if (!info?.portrait || seen.has(info.id)) continue;
      seen.add(info.id);
      reels.push({ id: `${p.id}:${info.id}`, title: p.title, url, cover: p.images[0] ?? info.thumb, property: card(p) });
    }
  }
  return reels.filter((r) => videoInfo(r.url));
}

/** Admin quick reels first, then reels attached to listings. Empty → the viewer and rail hide themselves. */
export async function getReels(): Promise<Reel[]> {
  return cachedReels(await getSiteMode());
}
