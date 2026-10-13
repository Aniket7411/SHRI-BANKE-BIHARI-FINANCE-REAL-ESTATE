import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Browser client for the admin panel (login, direct media uploads). */
export const supabaseBrowser = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
