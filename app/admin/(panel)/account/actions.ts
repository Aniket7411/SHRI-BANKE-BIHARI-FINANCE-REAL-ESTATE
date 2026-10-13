"use server";

import { requireStaff } from "@/lib/admin/auth";
import { fail, ok, text, type ActionResult } from "@/lib/admin/form";
import { supabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";

export async function updateProfile(fd: FormData): Promise<ActionResult> {
  const { staff } = await requireStaff();
  const full_name = text(fd, "full_name");
  if (full_name.length < 2) return fail("Enter your name", { full_name: "Enter your name" });
  if (!hasServiceRole()) return fail("Add SUPABASE_SERVICE_ROLE_KEY first.");
  // Agents can't write profiles under RLS, so this narrow self-update uses the service role.
  const { error } = await supabaseAdmin().from("profiles").update({ full_name, phone: text(fd, "phone") || null }).eq("id", staff.id);
  if (error) return fail(error.message);
  return ok("Profile saved");
}

export async function changePassword(fd: FormData): Promise<ActionResult> {
  const { db } = await requireStaff();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return fail("Use at least 8 characters", { password: "Use at least 8 characters" });
  if (password !== String(fd.get("confirm") ?? "")) return fail("Passwords don't match", { confirm: "Passwords don't match" });
  const { error } = await db.auth.updateUser({ password });
  if (error) return fail(error.message);
  return ok("Password updated");
}
