import "server-only";
import type { requireStaff } from "@/lib/admin/auth";
import { matchesRequirement, type MatchableProperty, type RequirementRow } from "@/lib/requirements";

type Db = Awaited<ReturnType<typeof requireStaff>>["db"];

/** Listing columns needed to match requirements and describe a property in an alert. */
export const ALERT_PROPERTY_COLUMNS = "id, title, category, type, purpose, city, locality, price, beds, area, images, status, created_at";

export interface AlertPropertyRow extends MatchableProperty {
  id: string;
  title: string;
  beds: number | null;
  area: number;
  images: string[];
  status: string;
  created_at: string;
}

export interface AlertLog {
  requirement_id: string;
  property_id: string;
  channel: "email" | "whatsapp";
  created_at: string;
}

/** Live (published) listings, newest first. */
export async function livePropertiesForMatching(db: Db) {
  const { data } = await db.from("properties").select(ALERT_PROPERTY_COLUMNS).eq("status", "published").order("created_at", { ascending: false }).limit(1000);
  return (data ?? []) as AlertPropertyRow[];
}

/** Open requirements (RLS limits agents to their own) that match one listing, plus what each was already sent. */
export async function requirementsMatching(db: Db, p: AlertPropertyRow) {
  const [{ data: reqs }, { data: logs }] = await Promise.all([
    db.from("requirements").select("*").neq("status", "closed").eq("purpose", p.purpose).order("created_at", { ascending: false }).limit(2000),
    db.from("requirement_alerts").select("requirement_id, property_id, channel, created_at").eq("property_id", p.id),
  ]);
  const sent = groupAlerts((logs ?? []) as AlertLog[], (l) => l.requirement_id);
  return ((reqs ?? []) as RequirementRow[]).filter((r) => matchesRequirement(p, r)).map((r) => ({ requirement: r, sent: sent.get(r.id) ?? {} }));
}

export type SentChannels = Partial<Record<AlertLog["channel"], string>>;

export function groupAlerts(logs: AlertLog[], key: (l: AlertLog) => string) {
  const out = new Map<string, SentChannels>();
  for (const l of logs) {
    const k = key(l);
    const cur = out.get(k) ?? {};
    if (!cur[l.channel] || l.created_at > cur[l.channel]!) cur[l.channel] = l.created_at;
    out.set(k, cur);
  }
  return out;
}
