/**
 * Property requirements ("tell us what you need" + new-listing alerts).
 * Shared by the public form, the API and the admin screens, so a requirement
 * matches the same listings everywhere.
 */
import { formatPrice } from "@/lib/format";
import type { Purpose } from "@/lib/types";

export const REQUIREMENT_STATUSES = [
  { value: "active", label: "Active", tone: "accent" },
  { value: "contacted", label: "Contacted", tone: "blue" },
  { value: "closed", label: "Closed", tone: "neutral" },
] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number]["value"];
export const requirementStatus = (v: string) => REQUIREMENT_STATUSES.find((s) => s.value === v) ?? REQUIREMENT_STATUSES[0];
export const isRequirementStatus = (v: string): v is RequirementStatus => REQUIREMENT_STATUSES.some((s) => s.value === v);

/** A `requirements` row as the admin screens read it. */
export interface RequirementRow {
  id: string;
  ref: number;
  lead_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  purpose: Purpose;
  city: string;
  localities: string[];
  category: string;
  types: string[];
  budget_min: number | string | null;
  budget_max: number | string | null;
  beds: number[];
  notes: string;
  alerts: boolean;
  status: RequirementStatus;
  source: string;
  token: string;
  last_notified_at: string | null;
  created_at: string;
}

/** The listing fields a requirement is matched on. */
export interface MatchableProperty {
  purpose: string;
  city: string;
  locality: string;
  category: string;
  type: string;
  price: number | string;
  beds?: number | null;
}

type Criteria = Pick<RequirementRow, "purpose" | "city" | "localities" | "category" | "types" | "budget_min" | "budget_max" | "beds">;

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

/** Prices up to this much over budget still count — buyers often stretch a little. */
const BUDGET_STRETCH = 0.1;

export function matchesRequirement(p: MatchableProperty, r: Criteria) {
  const price = Number(p.price);
  const min = num(r.budget_min);
  const max = num(r.budget_max);
  return (
    p.purpose === r.purpose &&
    (!r.city || p.city === r.city) &&
    (!r.localities.length || r.localities.includes(p.locality)) &&
    (!r.category || p.category === r.category) &&
    (!r.types.length || r.types.includes(p.type)) &&
    (min === null || price >= min * (1 - BUDGET_STRETCH)) &&
    (max === null || price <= max * (1 + BUDGET_STRETCH)) &&
    (!r.beds.length || (!!p.beds && r.beds.some((b) => (b === 5 ? p.beds! >= 5 : p.beds === b))))
  );
}

export function budgetLabel(r: Pick<Criteria, "purpose" | "budget_min" | "budget_max">) {
  const min = num(r.budget_min);
  const max = num(r.budget_max);
  const per = r.purpose === "Rent" ? "/mo" : "";
  if (min !== null && max !== null) return `${formatPrice(min)} – ${formatPrice(max)}${per}`;
  if (max !== null) return `Under ${formatPrice(max)}${per}`;
  if (min !== null) return `Above ${formatPrice(min)}${per}`;
  return "";
}

export const bedsLabel = (beds: number[]) =>
  beds.length
    ? `${[...beds]
        .sort((a, b) => a - b)
        .map((b) => (b === 5 ? "5+" : String(b)))
        .join(", ")} BHK`
    : "";

/** Short chips describing a requirement: ["Buy", "Flat, Villa", "2, 3 BHK", "Under ₹50 L", "Gomti Nagar, Lucknow"]. */
export function requirementChips(r: Criteria) {
  const where = [r.localities.join(", "), r.city].filter(Boolean).join(", ");
  return [r.purpose === "Rent" ? "Rent" : "Buy", r.types.join(", ") || r.category || "Any property", bedsLabel(r.beds), budgetLabel(r), where || "Any location"].filter(Boolean);
}

/** One-line summary for leads, emails and WhatsApp. */
export const requirementSummary = (r: Criteria) => requirementChips(r).join(" · ");

export const requirementRef = (ref: number) => `R-${ref}`;
