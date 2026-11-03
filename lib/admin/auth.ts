import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "agent";
export interface Staff {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/** Signed-in, active staff member for this request (deduped per render), or null. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  await cookies(); // always request-time (demo mode reads the demo_uid cookie through the same client)
  await connection(); // never prerender: Supabase's session check reads the clock (Date.now)
  const db = await supabaseServer();
  // Local JWT check (no Auth-server round trip); the profile's `active` flag still cuts off removed staff at once.
  const { data: auth } = await db.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return null;
  const { data } = await db.from("profiles").select("id, email, full_name, role, active").eq("id", uid).maybeSingle();
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
