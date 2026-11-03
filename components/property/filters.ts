import { BUDGETS, normalizeType } from "@/lib/property-meta";
import type { Property, PropertyCategory, Purpose } from "@/lib/types";

/** Browse-page filter state. Empty arrays / "" / false mean "any". */
export interface Filters {
  q: string;
  purpose: Purpose | "All";
  category: PropertyCategory | "";
  types: string[];
  budget: number; // index into BUDGETS[purpose], -1 = any
  beds: number[]; // 5 = 5+
  facing: string[];
  position: string[];
  roadMin: number;
  furnishing: string[];
  ownership: string[];
  approval: string[];
  possession: string[];
  structure: string[];
  locality: string;
  parking: boolean;
  verified: boolean;
  saved: boolean;
}

export const EMPTY: Filters = {
  q: "",
  purpose: "All",
  category: "",
  types: [],
  budget: -1,
  beds: [],
  facing: [],
  position: [],
  roadMin: 0,
  furnishing: [],
  ownership: [],
  approval: [],
  possession: [],
  structure: [],
  locality: "",
  parking: false,
  verified: false,
  saved: false,
};

const has = (list: string[], v?: string) => !list.length || (!!v && list.includes(v));

export function matches(p: Property, f: Filters, savedIds: string[]) {
  const d = p.details;
  const range = f.purpose !== "All" ? BUDGETS[f.purpose][f.budget] : undefined;
  const q = f.q.trim().toLowerCase();
  return (
    (f.purpose === "All" || p.purpose === f.purpose) &&
    (!f.category || p.category === f.category) &&
    has(f.types, p.type) &&
    (!range || ((range.min === undefined || p.price >= range.min) && (range.max === undefined || p.price <= range.max))) &&
    (!f.beds.length || (!!p.beds && f.beds.some((b) => (b === 5 ? p.beds! >= 5 : p.beds === b)))) &&
    has(f.facing, d.facing) &&
    has(f.position, d.position) &&
    (!f.roadMin || (d.roadWidth ?? 0) >= f.roadMin) &&
    has(f.furnishing, d.furnishing) &&
    has(f.ownership, d.ownership) &&
    has(f.approval, d.approval) &&
    has(f.possession, d.possession) &&
    has(f.structure, d.structure) &&
    (!f.locality || p.locality === f.locality) &&
    (!f.parking || (d.parking ?? 0) > 0) &&
    (!f.verified || !!p.verified) &&
    (!f.saved || savedIds.includes(p.id)) &&
    (!q || [p.title, p.locality, p.type, p.category, d.facing, ...p.tags].join(" ").toLowerCase().includes(q))
  );
}

/* URL <-> filters, so a search can be shared or bookmarked. */
const LISTS = ["types", "facing", "position", "furnishing", "ownership", "approval", "possession", "structure"] as const;

export function toQuery(f: Filters) {
  const q = new URLSearchParams();
  if (f.q) q.set("q", f.q);
  if (f.purpose !== "All") q.set("purpose", f.purpose);
  if (f.category) q.set("category", f.category);
  for (const k of LISTS) if (f[k].length) q.set(k === "types" ? "type" : k, f[k].join(","));
  if (f.budget >= 0) q.set("budget", String(f.budget));
  if (f.beds.length) q.set("bhk", f.beds.join(","));
  if (f.roadMin) q.set("road", String(f.roadMin));
  if (f.locality) q.set("locality", f.locality);
  if (f.parking) q.set("parking", "1");
  if (f.verified) q.set("verified", "1");
  return q;
}

export function fromQuery(q: URLSearchParams): Filters {
  const list = (k: string) => (q.get(k) ? q.get(k)!.split(",").filter(Boolean) : []);
  const purpose = q.get("purpose");
  const category = q.get("category");
  const f: Filters = {
    ...EMPTY,
    q: q.get("q") ?? "",
    purpose: purpose === "Buy" || purpose === "Rent" ? purpose : "All",
    category: category === "Residential" || category === "Commercial" || category === "Semi-commercial" ? category : "",
    types: list("type").map(normalizeType),
    budget: Number(q.get("budget") ?? -1),
    beds: list("bhk").map(Number).filter((n) => n >= 1 && n <= 5),
    roadMin: Number(q.get("road") ?? 0) || 0,
    locality: q.get("locality") ?? "",
    parking: q.get("parking") === "1",
    verified: q.get("verified") === "1",
  };
  for (const k of LISTS) if (k !== "types") f[k] = list(k);
  if (f.purpose === "All" || !BUDGETS[f.purpose][f.budget]) f.budget = -1;
  return f;
}
