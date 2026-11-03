import "server-only";
import { DEFAULT_CITIES, type City } from "@/lib/cities";
import type { requireAdmin } from "@/lib/admin/auth";

type Db = Awaited<ReturnType<typeof requireAdmin>>["db"];

/**
 * Cities for the property form: the `cities` table (falls back to Kanpur + Lucknow
 * before migration 0006 has run), with every locality already used by a listing.
 */
export async function loadCities(db: Db, used: { city?: string | null; locality: string }[]): Promise<City[]> {
  const { data, error } = await db.from("cities").select("name, localities").order("sort_order").order("name");
  const cities: City[] = !error && data?.length ? data.map((c) => ({ name: c.name, localities: c.localities ?? [] })) : structuredClone(DEFAULT_CITIES);
  for (const r of used) {
    const name = r.city || "Kanpur";
    let c = cities.find((x) => x.name === name);
    if (!c) cities.push((c = { name, localities: [] }));
    if (r.locality && !c.localities.includes(r.locality)) c.localities.push(r.locality);
  }
  return cities;
}

/** Make sure a city typed into the property form exists (and has this locality as a suggestion). */
export async function ensureCity(db: Db, name: string, locality: string) {
  const { data: row, error } = await db.from("cities").select("id, localities").eq("name", name).maybeSingle();
  if (error) return; // table missing (migration not run): the listing still saves with its city
  if (!row) {
    const { data: last } = await db.from("cities").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    await db.from("cities").insert({ name, localities: locality ? [locality] : [], sort_order: (last?.sort_order ?? -1) + 1 });
  } else if (locality && !(row.localities ?? []).includes(locality)) {
    await db.from("cities").update({ localities: [...(row.localities ?? []), locality] }).eq("id", row.id);
  }
}
