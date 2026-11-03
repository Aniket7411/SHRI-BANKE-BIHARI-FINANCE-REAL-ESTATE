import "server-only";
import type { Staff } from "./auth";
import { LEAD_STATUSES, type LeadStatus } from "./meta";
import { fromIstInput } from "./crm-meta";

/** Lead row as stored in Supabase (columns used by the CRM screens). */
export interface LeadRow {
  id: string;
  ref: number;
  name: string;
  phone: string;
  phone_norm: string;
  email: string | null;
  interest: string;
  budget: string | null;
  message: string | null;
  callback_slot: string | null;
  source: string;
  channel: string;
  property_id: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  follow_up_at: string | null;
  utm: Record<string, string> | null;
  meta: Record<string, unknown> | null;
  submissions: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface StaffLite {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "agent";
  active: boolean;
}

export const PAGE_SIZE = 20;

export interface LeadFilters {
  q: string;
  status: LeadStatus | "";
  owner: string; // profile id | "unassigned" | ""
  interest: string;
  source: string;
  from: string; // YYYY-MM-DD (IST)
  to: string;
  sort: "new" | "activity" | "follow_up";
  page: number;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

export function parseFilters(sp: Params): LeadFilters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return (Array.isArray(v) ? v[0] : (v ?? "")).trim();
  };
  const status = get("status");
  const sort = get("sort");
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  return {
    q: get("q").slice(0, 80),
    status: LEAD_STATUSES.some((s) => s.value === status) ? (status as LeadStatus) : "",
    owner: get("owner"),
    interest: get("interest"),
    source: get("source"),
    from: date(get("from")),
    to: date(get("to")),
    sort: sort === "activity" || sort === "follow_up" ? sort : "new",
    page: Math.max(1, Math.floor(Number(get("page")) || 1)),
  };
}

/** Query string for a filter set (empty values dropped), for links and the CSV export. */
export function filtersToQuery(f: Partial<LeadFilters>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === "" || v === undefined || v === null) continue;
    if (k === "page" && v === 1) continue;
    if (k === "sort" && v === "new") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** The subset of the PostgREST builder used here; every method returns the same builder. */
interface Filterable {
  eq(column: string, value: unknown): Filterable;
  is(column: string, value: null): Filterable;
  or(filters: string): Filterable;
  ilike(column: string, pattern: string): Filterable;
  gte(column: string, value: unknown): Filterable;
  lt(column: string, value: unknown): Filterable;
}

/**
 * Apply list filters. Agents are always scoped to their own leads (RLS does the same,
 * this just makes the intent explicit). `withStatus: false` is used for the status tab counts.
 */
export function applyLeadFilters<T>(query: T, f: LeadFilters, staff: Staff, { withStatus = true } = {}): T {
  // The builder's generics are too deep to constrain here; it really does return itself.
  let q = query as unknown as Filterable;
  if (staff.role !== "admin") q = q.eq("assigned_to", staff.id);
  else if (f.owner === "unassigned") q = q.is("assigned_to", null);
  else if (f.owner) q = q.eq("assigned_to", f.owner);

  if (withStatus && f.status) q = q.eq("status", f.status);
  if (f.interest) q = q.eq("interest", f.interest);
  if (f.source) q = q.eq("source", f.source);
  if (f.from) q = q.gte("created_at", fromIstInput(`${f.from}T00:00`));
  if (f.to) q = q.lt("created_at", new Date(new Date(fromIstInput(`${f.to}T00:00`)!).getTime() + 864e5).toISOString());

  const term = f.q.replace(/[,()%*\\]/g, " ").trim();
  if (term) {
    const ref = term.match(/^L-?(\d{3,})$/i)?.[1];
    const digits = term.replace(/[\s+-]/g, "");
    if (ref) q = q.eq("ref", Number(ref));
    else if (/^\d{4,}$/.test(digits)) q = q.ilike("phone_norm", `%${digits.slice(-10)}%`);
    else q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }
  return q as unknown as T;
}

export const leadSort = (f: LeadFilters) =>
  f.sort === "activity"
    ? ({ column: "last_activity_at", ascending: false, nullsFirst: false } as const)
    : f.sort === "follow_up"
      ? ({ column: "follow_up_at", ascending: true, nullsFirst: false } as const)
      : ({ column: "created_at", ascending: false, nullsFirst: false } as const);

/** Staff directory keyed by id (no embedded joins — the demo client doesn't support them). */
export function staffMap(rows: StaffLite[] | null | undefined) {
  return new Map((rows ?? []).map((p) => [p.id, p]));
}

export const staffName = (p: StaffLite | undefined) => (p ? p.full_name || p.email : "Unassigned");
