import type { Lead } from "@/lib/types";

const KEY = "sbb:leads";

/**
 * Submit a lead (enquiry / callback / loan application).
 * For now it's stored in the browser so the demo works end-to-end.
 * TODO (CRM): replace with `fetch("/api/leads", { method: "POST", body: JSON.stringify(lead) })`.
 */
export async function submitLead(lead: Lead): Promise<{ ok: true; id: string }> {
  const id = `L-${Date.now().toString(36).toUpperCase()}`;
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    all.push({ ...lead, id, createdAt: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — ignore in demo */
  }
  await new Promise((r) => setTimeout(r, 700));
  return { ok: true, id };
}

/** Indian mobile: 10 digits starting 6-9, optional +91 / 0 prefix. */
export const isValidPhone = (v: string) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ""));
