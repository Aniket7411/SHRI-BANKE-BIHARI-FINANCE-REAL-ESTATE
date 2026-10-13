import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Role = "admin" | "agent";
export interface Staff {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/** Signed-in, active staff member for this request (deduped per render), or null. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  await cookies(); // always request-time, even before Supabase is configured
  if (!isSupabaseConfigured) return null;
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("id, email, full_name, role, active").eq("id", user.id).maybeSingle();
  if (!data?.active) return null;
  return { id: data.id, email: data.email, fullName: data.full_name || data.email, role: data.role };
});

/** For pages: any active staff member, otherwise back to login. Returns the session-bound client. */
export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return { staff, db: await supabaseServer() };
}

/** For admin-only pages and every content mutation. */
export async function requireAdmin() {
  const ctx = await requireStaff();
  if (ctx.staff.role !== "admin") redirect("/admin?denied=1");
  return ctx;
}
