"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";

const PASSWORD_MIN = 8;
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(72, "Use 72 characters or fewer")
  .refine((v) => !/\s/.test(v), "No spaces, please");

const schema = z.object({
  full_name: z.string().min(2, "Enter their name"),
  email: z.email("Enter a valid email"),
  phone: z.string().max(20),
  role: z.enum(["admin", "agent"]),
  password: passwordSchema,
});

/** Login details shown once to the admin after creating a login or setting a password. */
export interface Credentials {
  name: string;
  email: string;
  password: string;
  phone: string;
}
export type CredentialsResult = ActionResult & { credentials?: Credentials };

/**
 * Create a login with the email and password the admin chose. Nothing is emailed:
 * the admin hands the details to the team member.
 */
export async function addMember(fd: FormData): Promise<CredentialsResult> {
  await requireAdmin();
  if (!hasServiceRole()) return fail("Add SUPABASE_SECRET_KEY to create logins.");
  const parsed = schema.safeParse({
    full_name: text(fd, "full_name"),
    email: text(fd, "email").toLowerCase(),
    phone: text(fd, "phone"),
    role: text(fd, "role") || "agent",
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { full_name, email, phone, role, password } = parsed.data;

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error || !data.user) {
    const msg = error?.message ?? "Could not create the login";
    if (/already/i.test(msg)) return fail("Someone with this email already has a login.", { email: "This email already has a login" });
    if (/password/i.test(msg)) return fail(msg, { password: msg });
    return fail(msg);
  }
  // The signup trigger created the profile as an agent; apply the chosen details.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name, phone: phone || null, role })
    .eq("id", data.user.id);
  if (profileError) console.error("[team] profile update failed:", profileError.message);
  refresh();
  return { ...ok(`Login created for ${full_name}`), credentials: { name: full_name, email, password, phone } };
}

async function guardSelf(id: string) {
  const { staff, db } = await requireAdmin();
  if (id === staff.id) return { error: fail("You can't change your own role or access here."), db };
  return { error: null, db };
}

export async function setMemberRole(fd: FormData): Promise<ActionResult> {
  const id = text(fd, "id");
  const { error: denied, db } = await guardSelf(id);
  if (denied) return denied;
  const role = text(fd, "role") === "admin" ? "admin" : "agent";
  const { error } = await db.from("profiles").update({ role }).eq("id", id);
  if (error) return fail(error.message);
  return ok(`Role changed to ${role === "admin" ? "Admin" : "Sales"}`);
}

export async function setMemberActive(fd: FormData): Promise<ActionResult> {
  const id = text(fd, "id");
  const { error: denied, db } = await guardSelf(id);
  if (denied) return denied;
  const active = text(fd, "active") === "true";
  const { error } = await db.from("profiles").update({ active }).eq("id", id);
  if (error) return fail(error.message);
  if (!active && hasServiceRole())
    await supabaseAdmin()
      .auth.admin.signOut(id)
      .catch(() => {});
  return ok(active ? "Access restored" : "Access removed. Their leads stay in the CRM.");
}

/** Admin sets a new password for a team member (they can't reset it themselves). */
export async function setMemberPassword(fd: FormData): Promise<CredentialsResult> {
  const id = text(fd, "id");
  const { error: denied } = await guardSelf(id);
  if (denied) return denied;
  if (!hasServiceRole()) return fail("Add SUPABASE_SECRET_KEY first.");
  const parsed = passwordSchema.safeParse(String(fd.get("password") ?? ""));
  if (!parsed.success) return fail(parsed.error.issues[0].message, { password: parsed.error.issues[0].message });
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.updateUserById(id, { password: parsed.data });
  if (error || !data.user?.email) return fail(error?.message ?? "Could not set the password");
  const { data: p } = await admin.from("profiles").select("full_name, phone").eq("id", id).maybeSingle();
  const name = p?.full_name || data.user.email;
  return { ...ok(`New password set for ${name}`), credentials: { name, email: data.user.email, password: parsed.data, phone: p?.phone ?? "" } };
}
