import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoBrowserClient } from "@/lib/demo/browser-client";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/** Browser client for the admin panel (login, direct media uploads). Demo shim until Supabase is configured. */
export const supabaseBrowser = (): SupabaseClient => (isSupabaseConfigured ? createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY) : demoBrowserClient());
