"use server";

import { requirementRef } from "@/lib/requirements";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AlertsResult = { ok: true; alerts: boolean } | { ok: false; message: string };

/** Public: turn a requirement's alerts on/off. The token in the email link proves ownership. */
export async function setAlerts(token: string, alerts: boolean): Promise<AlertsResult> {
  if (!/^[\w-]{16,64}$/.test(token)) return { ok: false, message: "This link isn't valid." };
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("requirements").update({ alerts }).eq("token", token).select("id, ref, lead_id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false, message: "This link isn't valid." };
    if (data.lead_id) {
      await db.from("lead_activities").insert({ lead_id: data.lead_id, kind: "note", body: `Customer turned ${alerts ? "on" : "off"} alerts for ${requirementRef(data.ref)}` });
    }
    return { ok: true, alerts };
  } catch (err) {
    console.error("[alerts]", err);
    return { ok: false, message: "Couldn't update your alerts right now. Please try again in a moment." };
  }
}
