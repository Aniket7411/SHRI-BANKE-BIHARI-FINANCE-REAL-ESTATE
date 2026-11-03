import type { Tone } from "@/components/admin/ui";
import type { LeadStatus } from "./meta";

/** Client-safe CRM constants and helpers (call outcomes, IST date maths, contact links). */

export const CALL_OUTCOMES = [
  { value: "not_picked", label: "Not picked", tone: "neutral" },
  { value: "busy", label: "Busy", tone: "neutral" },
  { value: "interested", label: "Interested", tone: "green" },
  { value: "call_back", label: "Call back later", tone: "amber" },
  { value: "site_visit", label: "Site visit fixed", tone: "accent" },
  { value: "not_interested", label: "Not interested", tone: "red" },
  { value: "wrong_number", label: "Wrong number", tone: "red" },
  { value: "won", label: "Closed – won", tone: "green" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];

export type CallOutcome = (typeof CALL_OUTCOMES)[number]["value"];
export const callOutcome = (v: unknown) => CALL_OUTCOMES.find((o) => o.value === v) ?? CALL_OUTCOMES[0];
export const isCallOutcome = (v: string): v is CallOutcome => CALL_OUTCOMES.some((o) => o.value === v);

/** Outcomes that close the lead, so no follow-up is suggested. */
export const CLOSING_OUTCOMES: readonly CallOutcome[] = ["not_interested", "wrong_number", "won"];

/** Where a lead's status should move after a logged call (null = leave as is). */
export function statusAfterCall(outcome: CallOutcome, current: LeadStatus): LeadStatus | null {
  switch (outcome) {
    case "won":
      return current === "won" ? null : "won";
    case "not_interested":
    case "wrong_number":
      return current === "lost" || current === "won" ? null : "lost";
    case "site_visit":
      return current === "negotiation" || current === "won" ? null : "site_visit";
    case "interested":
      return current === "new" || current === "contacted" ? "qualified" : null;
    default:
      return current === "new" ? "contacted" : null;
  }
}

export const LEAD_INTERESTS = ["Buy Property", "Sell Property", "Rent", "Plot", "Home Loan", "Loan Against Property", "Vehicle Loan", "Education Loan", "OD/CC Limit", "Other"] as const;

export const MANUAL_SOURCES = ["Phone call", "Walk-in", "Referral", "Site board", "Newspaper", "Existing customer", "Other"] as const;

/* ---------------------------------------------------------------- dates (IST) */

const IST_OFFSET = "+05:30";

/** "YYYY-MM-DD" for the given instant in India. */
export const istDate = (d: Date | string | number = Date.now()) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** Midnight IST of the day containing `d`. */
export const istDayStart = (d: Date | string | number = Date.now()) => new Date(`${istDate(d)}T00:00:00${IST_OFFSET}`);

/** Value for <input type="datetime-local"> shown in IST. */
export function toIstInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${istDate(d)}T${time}`;
}

/** Parse a datetime-local value typed in IST → ISO string (null when empty/invalid). */
export function fromIstInput(v: string) {
  if (!v) return null;
  const d = new Date(`${v.length === 16 ? `${v}:00` : v}${IST_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** datetime-local value `days` from today (IST) at a given hour. */
export function istInputInDays(days: number, hour = 11) {
  const day = new Date(istDayStart().getTime() + days * 864e5 + 12 * 36e5); // noon avoids DST-free edge cases
  return `${istDate(day)}T${String(hour).padStart(2, "0")}:00`;
}

/** "Today, 4:30 pm" / "Tomorrow, 11:00 am" / "Mon, 27 Oct, 11:00 am" in IST. */
export function fmtFollowUp(iso: string, now = Date.now()) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
  const diffDays = Math.round((istDayStart(d).getTime() - istDayStart(now).getTime()) / 864e5);
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Tomorrow, ${time}`;
  if (diffDays === -1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })}, ${time}`;
}

/* ---------------------------------------------------------------- contact links */

export const phone10 = (v: string) => v.replace(/\D/g, "").slice(-10);
export const telHref = (v: string) => `tel:+91${phone10(v)}`;
export const waHref = (v: string, text?: string) => `https://wa.me/91${phone10(v)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
