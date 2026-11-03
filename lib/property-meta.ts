/**
 * Listing vocabulary shared by the admin form, the browse filters and the detail page.
 * Every optional attribute is described once here (label, input kind, options and
 * which listings it applies to), so adding a field is a one-line change.
 */
import type { AreaUnit, Property, PropertyCategory, PropertyDetails, Purpose } from "@/lib/types";

export const CATEGORIES: { value: PropertyCategory; hint: string }[] = [
  { value: "Residential", hint: "Flats, houses, villas, plots" },
  { value: "Commercial", hint: "Shops, offices, showrooms, godowns" },
  { value: "Semi-commercial", hint: "Shop + residence, mixed use" },
];

export const PROPERTY_TYPES: Record<PropertyCategory, readonly string[]> = {
  Residential: ["Flat", "Independent House", "Villa", "Builder Floor", "Penthouse", "Studio", "Residential Plot", "Farm House"],
  Commercial: ["Shop", "Office Space", "Showroom", "Warehouse / Godown", "Commercial Plot", "Hotel / Guest House"],
  "Semi-commercial": ["Shop cum Residence", "Mixed-use Building", "Semi-commercial Plot"],
};
export const ALL_TYPES = Object.values(PROPERTY_TYPES).flat();

/** Units inside a larger building — they have a floor number, not their own plot. */
const UNIT_TYPES = ["Flat", "Builder Floor", "Penthouse", "Studio", "Shop", "Office Space", "Showroom"];

export const isPlot = (type: string) => type.endsWith("Plot");
export const categoryOf = (type: string): PropertyCategory =>
  (Object.keys(PROPERTY_TYPES) as PropertyCategory[]).find((c) => PROPERTY_TYPES[c].includes(type)) ?? "Residential";

/** Listings saved before the category split used five broad types. */
const LEGACY_TYPES: Record<string, string> = { Apartment: "Flat", House: "Independent House", Plot: "Residential Plot", Commercial: "Office Space" };
export const normalizeType = (type: string) => LEGACY_TYPES[type] ?? type;

/* ------------------------------------------------------------------ area units */

export const AREA_UNITS: { value: AreaUnit; label: string; long: string; perSqft: number }[] = [
  { value: "sqft", label: "sq.ft", long: "Square feet", perSqft: 1 },
  { value: "sqm", label: "sq.m", long: "Square metres", perSqft: 1 / 10.7639 },
  { value: "sqyd", label: "sq.yd", long: "Square yards (gaj)", perSqft: 1 / 9 },
];
const unitOf = (u: AreaUnit) => AREA_UNITS.find((x) => x.value === u) ?? AREA_UNITS[0];

export const fromSqft = (sqft: number, unit: AreaUnit) => sqft * unitOf(unit).perSqft;
export const toSqft = (value: number, unit: AreaUnit) => value / unitOf(unit).perSqft;

/** 1,650 sq.ft · 153.3 sq.m · 183.3 sq.yd */
export function formatArea(sqft: number, unit: AreaUnit = "sqft") {
  const v = fromSqft(sqft, unit);
  const digits = unit === "sqft" || v >= 1000 ? 0 : 1;
  return `${v.toLocaleString("en-IN", { maximumFractionDigits: digits })} ${unitOf(unit).label}`;
}

/* ------------------------------------------------------------------ detail fields */

export interface Ctx {
  category: PropertyCategory;
  type: string;
  purpose: Purpose;
}
type Rule = (c: Ctx) => boolean;

const built: Rule = (c) => !isPlot(c.type);
const homes: Rule = (c) => c.category !== "Commercial" && built(c);
const business: Rule = (c) => c.category !== "Residential" && built(c);
const unit: Rule = (c) => UNIT_TYPES.includes(c.type);
const ownLand: Rule = (c) => !UNIT_TYPES.includes(c.type);
const sale: Rule = (c) => c.purpose === "Buy";
const rent: Rule = (c) => c.purpose === "Rent";

type Key = keyof PropertyDetails;
export type DetailField =
  | { key: Key; label: string; kind: "select"; options: readonly string[]; when?: Rule }
  | { key: Key; label: string; kind: "multi"; options: readonly string[]; when?: Rule }
  | { key: Key; label: string; kind: "number"; suffix?: string; placeholder?: string; when?: Rule }
  | { key: Key; label: string; kind: "area" | "money" | "flag"; when?: Rule }
  | { key: Key; label: string; kind: "text" | "date"; placeholder?: string; when?: Rule };

export const FACINGS = ["East", "North", "West", "South", "North-East", "North-West", "South-East", "South-West"] as const;
export const POSITIONS = ["Road side", "Back side", "Corner"] as const;
export const FURNISHING = ["Furnished", "Semi-furnished", "Unfurnished"] as const;
export const OWNERSHIP = ["Freehold", "Leasehold", "Co-operative society", "Power of attorney"] as const;
export const APPROVAL = ["Approved", "Unapproved"] as const;
export const POSSESSION = ["Ready to move", "Under construction"] as const;
export const STRUCTURE = ["Single unit", "Multi-storey"] as const;

export const DETAIL_SECTIONS: { title: string; fields: DetailField[] }[] = [
  {
    title: "Building & layout",
    fields: [
      { key: "structure", label: "Building", kind: "select", options: STRUCTURE, when: built },
      { key: "totalFloors", label: "Total floors", kind: "number", when: built },
      { key: "floor", label: "On floor", kind: "number", placeholder: "0 = ground", when: unit },
      { key: "furnishing", label: "Furnishing", kind: "select", options: FURNISHING, when: built },
      { key: "flooring", label: "Flooring", kind: "select", options: ["Vitrified tiles", "Marble", "Granite", "Wooden", "Ceramic tiles", "Mosaic", "Cement"], when: built },
    ],
  },
  {
    title: "Rooms",
    fields: [
      { key: "livingHalls", label: "Living halls", kind: "number", when: homes },
      { key: "balconies", label: "Balconies", kind: "number", when: homes },
      { key: "dining", label: "Dining area", kind: "flag", when: homes },
      { key: "storeRoom", label: "Store room", kind: "flag", when: homes },
      { key: "poojaRoom", label: "Pooja room", kind: "flag", when: homes },
      { key: "studyRoom", label: "Study room", kind: "flag", when: homes },
      { key: "servantRoom", label: "Servant room", kind: "flag", when: homes },
    ],
  },
  {
    title: "Area & plot",
    fields: [
      { key: "carpetArea", label: "Carpet area", kind: "area", when: built },
      { key: "plotArea", label: "Plot area", kind: "area", when: (c) => ownLand(c) && built(c) },
      { key: "plotLength", label: "Plot length", kind: "number", suffix: "ft", when: ownLand },
      { key: "plotWidth", label: "Plot width", kind: "number", suffix: "ft", when: ownLand },
      { key: "openSides", label: "Open sides", kind: "number", when: ownLand },
      { key: "boundaryWall", label: "Boundary wall", kind: "flag", when: (c) => isPlot(c.type) },
    ],
  },
  {
    title: "Location & road",
    fields: [
      { key: "facing", label: "Facing", kind: "select", options: FACINGS },
      { key: "position", label: "Position", kind: "select", options: POSITIONS },
      { key: "roadWidth", label: "Front road width", kind: "number", suffix: "ft" },
      { key: "cornerPlot", label: "Corner property", kind: "flag", when: ownLand },
    ],
  },
  {
    title: "Parking",
    fields: [
      { key: "parking", label: "Car parking", kind: "number", suffix: "car(s)", when: built },
      { key: "parkingType", label: "Parking type", kind: "select", options: ["Covered", "Open", "Covered + open"], when: built },
    ],
  },
  {
    title: "Legal & ownership",
    fields: [
      { key: "ownership", label: "Ownership", kind: "select", options: OWNERSHIP },
      { key: "approval", label: "Approval", kind: "select", options: APPROVAL },
      { key: "approvedBy", label: "Approved by", kind: "text", placeholder: "KDA, Nagar Nigam, RERA…" },
      { key: "reraId", label: "RERA no.", kind: "text", placeholder: "UPRERAPRJ…" },
    ],
  },
  {
    title: "Possession & age",
    fields: [
      { key: "possession", label: "Status", kind: "select", options: POSSESSION, when: built },
      { key: "possessionDate", label: "Possession by", kind: "text", placeholder: "e.g. Mar 2027", when: built },
      { key: "transaction", label: "Transaction", kind: "select", options: ["New booking", "Resale"], when: sale },
      { key: "age", label: "Property age", kind: "select", options: ["New construction", "0–1 years", "1–5 years", "5–10 years", "10+ years"], when: built },
    ],
  },
  {
    title: "Utilities",
    fields: [
      { key: "waterSupply", label: "Water supply", kind: "select", options: ["Municipal", "Borewell", "Municipal + borewell"], when: built },
      { key: "powerBackup", label: "Power backup", kind: "select", options: ["None", "Partial", "Full"], when: built },
    ],
  },
  {
    title: "Commercial",
    fields: [
      { key: "frontage", label: "Frontage", kind: "number", suffix: "ft", when: business },
      { key: "ceilingHeight", label: "Ceiling height", kind: "number", suffix: "ft", when: business },
      { key: "washroomType", label: "Washroom", kind: "select", options: ["Private", "Shared", "None"], when: business },
      { key: "pantry", label: "Pantry", kind: "flag", when: business },
      { key: "suitableFor", label: "Suitable for", kind: "multi", options: ["Retail", "Office", "Clinic", "Restaurant", "Bank / ATM", "Coaching", "Showroom", "Storage"], when: business },
    ],
  },
  {
    title: "Rental terms",
    fields: [
      { key: "securityDeposit", label: "Security deposit", kind: "money", when: rent },
      { key: "lockIn", label: "Lock-in", kind: "number", suffix: "months", when: rent },
      { key: "tenants", label: "Preferred tenants", kind: "multi", options: ["Family", "Bachelors", "Working women", "Students", "Company lease"], when: rent },
      { key: "availableFrom", label: "Available from", kind: "date", when: rent },
    ],
  },
  {
    title: "Charges",
    fields: [
      { key: "maintenance", label: "Maintenance / month", kind: "money", when: built },
      { key: "negotiable", label: "Price negotiable", kind: "flag" },
    ],
  },
];

export const applies = (f: DetailField, c: Ctx) => !f.when || f.when(c);

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Human-readable value, or null when the field is empty / not applicable. */
export function formatDetail(f: DetailField, d: PropertyDetails, unit: AreaUnit = "sqft"): string | null {
  const v = d[f.key];
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) || v === false) return null;
  switch (f.kind) {
    case "flag":
      return "Yes";
    case "area":
      return formatArea(Number(v), unit);
    case "money":
      return inr(Number(v));
    case "multi":
      return (v as string[]).join(", ");
    case "date":
      return new Date(String(v)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    case "number":
      if (f.key === "floor") return Number(v) === 0 ? "Ground" : `${v}${ordinal(Number(v))}`;
      return `${v}${f.suffix ? ` ${f.suffix}` : ""}`;
    default:
      return String(v);
  }
}
const ordinal = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");

/** Filled, applicable rows for the detail page, grouped by section. */
export function detailGroups(p: Property, unit: AreaUnit = "sqft") {
  const c: Ctx = { category: p.category, type: p.type, purpose: p.purpose };
  return DETAIL_SECTIONS.map((s) => ({
    title: s.title,
    rows: s.fields
      .filter((f) => applies(f, c))
      .map((f) => ({ label: f.label, value: formatDetail(f, p.details, unit) }))
      .filter((r): r is { label: string; value: string } => r.value !== null),
  })).filter((s) => s.rows.length);
}

/** Short headline facts: "3 BHK · Flat · East facing" */
export function summaryLine(p: Property) {
  return [p.beds ? `${p.beds} BHK` : null, p.type, p.details.facing ? `${p.details.facing} facing` : null].filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ budget presets */

export const BUDGETS: Record<Purpose, { label: string; min?: number; max?: number }[]> = {
  Buy: [
    { label: "Under ₹50 L", max: 5e6 },
    { label: "₹50 L – 1 Cr", min: 5e6, max: 1e7 },
    { label: "₹1 – 2 Cr", min: 1e7, max: 2e7 },
    { label: "₹2 – 2.5 Cr", min: 2e7, max: 2.5e7 },
    { label: "Above ₹2.5 Cr", min: 2.5e7 },
  ],
  Rent: [
    { label: "Under ₹10k", max: 1e4 },
    { label: "₹10k – 25k", min: 1e4, max: 2.5e4 },
    { label: "₹25k – 50k", min: 2.5e4, max: 5e4 },
    { label: "₹50k – 1 L", min: 5e4, max: 1e5 },
    { label: "Above ₹1 L", min: 1e5 },
  ],
};
