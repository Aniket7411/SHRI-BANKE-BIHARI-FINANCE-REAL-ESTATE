/**
 * Create (or reset) admin logins directly in Supabase with the secret key.
 *   ADMIN_PASSWORD='…' npm run admin:create -- owner@example.com other@example.com
 * The password is read from the environment only — never stored in the repo.
 * Existing users get their password reset; every listed user is made an active admin.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_PASSWORD;
const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env or .env.local first.");
  process.exit(1);
}
if (!password || password.length < 8 || !emails.length) {
  console.error("Usage: ADMIN_PASSWORD='…' npm run admin:create -- email [email…]  (password ≥ 8 chars)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { error: schemaError } = await db.from("profiles").select("id").limit(1);
  if (schemaError) {
    console.error(`Database not set up yet (${schemaError.message}). Run the SQL migrations first.`);
    process.exitCode = 1;
    return;
  }

  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  for (const email of emails) {
    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    const { data, error } = existing
      ? await db.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
      : await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`${email}: ${error?.message ?? "no user returned"}`);

    const { error: profileError } = await db
      .from("profiles")
      .upsert({ id: data.user.id, email, full_name: email.split("@")[0], role: "admin", active: true });
    if (profileError) throw new Error(`${email} profile: ${profileError.message}`);
    console.log(`✓ ${email} — ${existing ? "password reset" : "created"}, admin`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
