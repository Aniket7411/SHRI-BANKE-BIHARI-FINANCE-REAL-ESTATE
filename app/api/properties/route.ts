import { NextResponse, type NextRequest } from "next/server";
import { getProperties, isSitePreview } from "@/lib/api";

/**
 * Public listings feed: GET /api/properties
 * Reads through getProperties(), so it follows the website mode (demo / live / preview)
 * and only ever returns published listings.
 *
 * Query params (all optional):
 *   purpose=Buy|Rent  category=Residential|Commercial|Semi-commercial
 *   type=<Flat, Shop, Residential Plot…>  facing=<East…>  city=<Kanpur…>  locality=<name>
 *   featured=true  q=<text>  minPrice  maxPrice  beds (minimum)
 *   limit (default 24, max 100)  offset (default 0)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const num = (k: string) => {
    const v = Number(sp.get(k));
    return sp.get(k) !== null && Number.isFinite(v) ? v : undefined;
  };

  const purpose = sp.get("purpose");
  const type = sp.get("type");
  const category = sp.get("category");
  const facing = sp.get("facing");
  const city = sp.get("city");
  const locality = sp.get("locality");
  const q = sp.get("q")?.trim().toLowerCase();
  const featured = sp.get("featured") === "true";
  const minPrice = num("minPrice");
  const maxPrice = num("maxPrice");
  const beds = num("beds");
  const limit = Math.min(Math.max(Math.trunc(num("limit") ?? 24), 1), 100);
  const offset = Math.max(Math.trunc(num("offset") ?? 0), 0);

  const matches = (await getProperties()).filter(
    (p) =>
      (!purpose || eq(p.purpose, purpose)) &&
      (!city || eq(p.city, city)) &&
      (!category || eq(p.category, category)) &&
      (!type || eq(p.type, type)) &&
      (!facing || eq(p.details.facing ?? "", facing)) &&
      (!locality || eq(p.locality, locality)) &&
      (!featured || p.featured) &&
      (minPrice === undefined || p.price >= minPrice) &&
      (maxPrice === undefined || p.price <= maxPrice) &&
      (beds === undefined || (p.beds ?? 0) >= beds) &&
      (!q || [p.title, p.locality, p.type, p.description, ...p.tags].some((s) => s.toLowerCase().includes(q))),
  );

  return NextResponse.json(
    { total: matches.length, limit, offset, items: matches.slice(offset, offset + limit) },
    // Never let a CDN cache an admin's live-preview response.
    { headers: { "cache-control": (await isSitePreview()) ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
