/**
 * One-time import of the current static content into Supabase.
 *   npm run db:seed
 * Safe to re-run: rows are upserted by id; testimonials / FAQs / jobs are only
 * inserted when their table is empty so admin edits are never overwritten.
 */
import { createClient } from "@supabase/supabase-js";
import { properties } from "@/lib/data/properties";
import { loanProducts } from "@/lib/data/loans";
import { faqs, testimonials } from "@/lib/data/content";
import { jobs } from "@/lib/data/jobs";
import { defaultSettings } from "@/lib/site";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function step(label: string, run: () => PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await run();
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`✓ ${label}`);
}

async function isEmpty(table: string) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return !count;
}

async function main() {
  await step(`properties (${properties.length})`, () =>
    db.from("properties").upsert(
      properties.map((p, i) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        purpose: p.purpose,
        locality: p.locality,
        price: p.price,
        beds: p.beds ?? null,
        baths: p.baths ?? null,
        area: p.area,
        images: p.images,
        tags: p.tags,
        amenities: p.amenities,
        description: p.description,
        featured: Boolean(p.featured),
        verified: Boolean(p.verified),
        sort_order: i,
      })),
    ),
  );

  await step(`loan products (${loanProducts.length})`, () =>
    db.from("loan_products").upsert(
      loanProducts.map((l, i) => ({
        id: l.id,
        name: l.name,
        short: l.short,
        icon: l.icon,
        rate: l.rate,
        max_tenure_years: l.maxTenureYears,
        max_amount: l.maxAmount,
        processing: l.processing,
        highlights: l.highlights,
        eligibility: l.eligibility,
        documents: l.documents,
        image: l.image,
        sort_order: i,
      })),
    ),
  );

  if (await isEmpty("testimonials")) {
    await step(`testimonials (${testimonials.length})`, () =>
      db.from("testimonials").insert(testimonials.map((t, i) => ({ ...t, sort_order: i }))),
    );
  }

  if (await isEmpty("faqs")) {
    await step(`faqs (${faqs.length})`, () => db.from("faqs").insert(faqs.map((f, i) => ({ ...f, sort_order: i }))));
  }

  if (await isEmpty("jobs")) {
    await step(`jobs (${jobs.length})`, () =>
      db.from("jobs").insert(
        jobs.map((j, i) => ({
          slug: j.slug,
          title: j.title,
          department: j.department,
          location: j.location,
          employment_type: j.employmentType,
          experience: j.experience,
          salary: j.salary,
          description: j.description,
          responsibilities: j.responsibilities,
          requirements: j.requirements,
          sort_order: i,
        })),
      ),
    );
  }

  const { data: existing } = await db.from("site_settings").select("id").eq("id", 1).maybeSingle();
  if (!existing) {
    await step("site settings", () =>
      db.from("site_settings").insert({ id: 1, data: { ...defaultSettings, rates: undefined } }),
    );
  }

  console.log("\nDone. Open the site — it now reads from Supabase.");
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
