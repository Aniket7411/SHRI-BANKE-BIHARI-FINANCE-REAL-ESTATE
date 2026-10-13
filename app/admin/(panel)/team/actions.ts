"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getSiteSettings } from "@/lib/api";
import { requireAdmin } from "@/lib/admin/auth";
import { fail, fieldErrors, ok, text, type ActionResult } from "@/lib/admin/form";
import { button as mailButton, detailsTable, layout, sendMail, siteUrl } from "@/lib/mail";
import { hasServiceRole, supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  full_name: z.string().min(2, "Enter their name"),
  email: z.email("Enter a valid email"),
  phone: z.string().max(20),
  role: z.enum(["admin", "agent"]),
});

/** Readable temporary password, e.g. "Kanpur-7f3k9q2m". */
const tempPassword = () => `Kanpur-${randomBytes(6).toString("base64url").slice(0, 8)}`;

export async function addMember(fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!hasServiceRole()) return fail("Add SUPABASE_SERVICE_ROLE_KEY to create logins.");
  const parsed = schema.safeParse({ full_name: text(fd, "full_name"), email: text(fd, "email").toLowerCase(), phone: text(fd, "phone"), role: text(fd, "role") || "agent" });
  if (!parsed.success) return fail("Please fix the highlighted fields", fieldErrors(parsed.error));
  const { full_name, email, phone, role } = parsed.data;

  const password = tempPassword();
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error || !data.user) return fail(error?.message.includes("already") ? "Someone with this email already has a login." : (error?.message ?? "Could not create user"));
  // The signup trigger created the profile as an agent; apply the chosen details.
  await admin.from("profiles").update({ full_name, phone: phone || null, role }).eq("id", data.user.id);

  const sent = await sendMail({
    to: email,
    subject: "Your login for the Shri Banke Bihari CRM",
    html: layout(
      `Welcome to the team, ${full_name.split(" ")[0]}!`,
      `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">An account has been created for you. Sign in and change your password from <em>My account</em>.</p>` +
        detailsTable([
          ["Login page", `${siteUrl()}/admin`],
          ["Email", email],
          ["Temporary password", password],
          ["Role", role === "admin" ? "Admin" : "Agent"],
        ]) +
        mailButton(`${siteUrl()}/admin/login`, "Sign in"),
      await getSiteSettings(),
    ),
  });

  return ok(sent ? `Login created and emailed to ${email}` : `Login created. Email isn't set up, so share this password: ${password}`);
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
  return ok(`Role changed to ${role}`);
}

export async function setMemberActive(fd: FormData): Promise<ActionResult> {
  const id = text(fd, "id");
  const { error: denied, db } = await guardSelf(id);
  if (denied) return denied;
  const active = text(fd, "active") === "true";
  const { error } = await db.from("profiles").update({ active }).eq("id", id);
  if (error) return fail(error.message);
  if (!active && hasServiceRole()) await supabaseAdmin().auth.admin.signOut(id).catch(() => {});
  return ok(active ? "Access restored" : "Access removed. Their leads stay in the CRM.");
}

export async function resetMemberPassword(fd: FormData): Promise<ActionResult> {
  const id = text(fd, "id");
  const { error: denied } = await guardSelf(id);
  if (denied) return denied;
  if (!hasServiceRole()) return fail("Add SUPABASE_SERVICE_ROLE_KEY first.");
  const admin = supabaseAdmin();
  const password = tempPassword();
  const { data, error } = await admin.auth.admin.updateUserById(id, { password });
  if (error || !data.user?.email) return fail(error?.message ?? "Could not reset password");
  const sent = await sendMail({
    to: data.user.email,
    subject: "Your CRM password was reset",
    html: layout("New temporary password", detailsTable([["Email", data.user.email], ["Temporary password", password]]) + mailButton(`${siteUrl()}/admin/login`, "Sign in"), await getSiteSettings()),
  });
  return ok(sent ? "New password emailed" : `New password: ${password}`);
}
