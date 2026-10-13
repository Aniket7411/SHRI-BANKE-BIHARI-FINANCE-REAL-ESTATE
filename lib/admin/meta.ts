import type { Tone } from "@/components/admin/ui";

/** Labels and badge colours shared by admin screens. */

export const LEAD_STATUSES = [
  { value: "new", label: "New", tone: "blue" },
  { value: "contacted", label: "Contacted", tone: "accent" },
  { value: "qualified", label: "Qualified", tone: "amber" },
  { value: "site_visit", label: "Site visit", tone: "amber" },
  { value: "negotiation", label: "Negotiation", tone: "amber" },
  { value: "won", label: "Won", tone: "green" },
  { value: "lost", label: "Lost", tone: "red" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];
export const leadStatus = (v: string) => LEAD_STATUSES.find((s) => s.value === v) ?? LEAD_STATUSES[0];

export const LISTING_STATUSES = [
  { value: "published", label: "Published", tone: "green" },
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "sold", label: "Sold", tone: "red" },
  { value: "rented", label: "Rented", tone: "blue" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];
export const listingStatus = (v: string) => LISTING_STATUSES.find((s) => s.value === v) ?? LISTING_STATUSES[0];

export const APPLICATION_STATUSES = [
  { value: "new", label: "New", tone: "blue" },
  { value: "shortlisted", label: "Shortlisted", tone: "accent" },
  { value: "interview", label: "Interview", tone: "amber" },
  { value: "hired", label: "Hired", tone: "green" },
  { value: "rejected", label: "Rejected", tone: "red" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];
export const applicationStatus = (v: string) => APPLICATION_STATUSES.find((s) => s.value === v) ?? APPLICATION_STATUSES[0];

const rel = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
/** "3 hours ago", "yesterday"… */
export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rel.format(Math.round(diff / s), u);
  return "just now";
}

export const fmtDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
