"use server";

import { z } from "zod";
import { siteUrl } from "@/lib/mail";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublic } from "@/lib/supabase/public";

/** Same reply whatever the email, so the form can't be used to discover accounts. */
const SENT = "If this is an admin login, a reset link is on its way. Sales team: ask your admin to set a new password for you.";

/** "Forgot password?" — only admins get a reset email; everyone else's password is set by an admin. */
export async function requestPasswordReset(rawEmail: string): Promise<{ ok: boolean; message: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { ok: false, message: "Enter a valid email." };
  if (!hasServiceRole()) return { ok: true, message: SENT };
  try {
    const { data } = await supabaseAdmin().from("profiles").select("role, active").ilike("email", email).maybeSingle();
    if (data?.role === "admin" && data.active) {
      const { error } = await supabasePublic().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/admin/auth/callback?next=/admin/account` });
      if (error) console.error("[auth] reset email failed:", error.message);
    }
  } catch (err) {
    console.error("[auth] reset lookup failed:", err);
  }
  return { ok: true, message: SENT };
}
