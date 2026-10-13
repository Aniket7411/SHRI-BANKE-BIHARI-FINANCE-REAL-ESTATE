import type { Lead } from "@/lib/types";
import { getUtm } from "@/lib/utm";

/**
 * Submit a lead (enquiry / callback / loan application) to the CRM.
 * The server stores it in Supabase, merges repeat enquiries and emails the team.
 */
export async function submitLead(lead: Lead & { website?: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, utm: lead.utm ?? getUtm() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? "Something went wrong. Please try again." };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again." };
  }
}

/** Indian mobile: 10 digits starting 6-9, optional +91 / 0 prefix. */
export const isValidPhone = (v: string) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ""));
