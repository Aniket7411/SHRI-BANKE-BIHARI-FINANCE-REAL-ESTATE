import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoClient } from "@/lib/demo/db";
import { DEMO_COOKIE, demoCookieOptions } from "@/lib/demo/session";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/** Per-request client acting as the signed-in staff member (RLS applies). Demo database until Supabase is configured. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  if (!isSupabaseConfigured) {
    return demoClient({
      kind: "user",
      uid: store.get(DEMO_COOKIE)?.value ?? null,
      setSession: (uid) => {
        try {
          if (uid) store.set(DEMO_COOKIE, uid, demoCookieOptions);
          else store.delete(DEMO_COOKIE);
        } catch {
          /* called from a Server Component — cookies can only change in actions / route handlers */
        }
      },
    });
  }
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component — proxy.ts refreshes the session instead */
        }
      },
    },
  });
}
