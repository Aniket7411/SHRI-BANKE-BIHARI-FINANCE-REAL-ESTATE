"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/admin/login");
}
