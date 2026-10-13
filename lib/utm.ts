import type { Utm } from "@/lib/types";

const KEY = "sbb:utm";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

/** Remember the first campaign that brought this visitor in (per browser session). */
export function captureUtm() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const q = new URLSearchParams(location.search);
    const utm: Utm = { landing: location.pathname };
    for (const p of PARAMS) {
      const v = q.get(p);
      if (v) utm[p] = v.slice(0, 300);
    }
    if (!utm.utm_source && document.referrer && !document.referrer.startsWith(location.origin)) {
      utm.utm_source = new URL(document.referrer).hostname;
      utm.utm_medium = "referral";
    }
    sessionStorage.setItem(KEY, JSON.stringify(utm));
  } catch {
    /* storage unavailable */
  }
}

export function getUtm(): Utm | undefined {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}
