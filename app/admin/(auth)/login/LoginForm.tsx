"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { button } from "@/components/admin/ui";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ?? "");
  const [notice, setNotice] = useState("");

  if (!isSupabaseConfigured || params.get("setup")) {
    return (
      <p className="text-sm text-ink-soft">
        Supabase isn&apos;t connected yet. Add <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="text-ink">.env.local</code> and restart the server.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    setError("");
    setNotice("");
    setBusy(true);
    const db = supabaseBrowser();
    if (mode === "reset") {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/admin/auth/callback?next=/admin/account`,
      });
      setBusy(false);
      if (error) setError(error.message);
      else setNotice("If that email belongs to a team member, a reset link is on its way.");
      return;
    }
    const { error } = await db.auth.signInWithPassword({ email, password: String(fd.get("password") ?? "") });
    if (error) {
      setBusy(false);
      setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      return;
    }
    const next = params.get("next");
    router.replace(next?.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h1 className="text-xl font-semibold text-ink">{mode === "login" ? "Sign in" : "Reset password"}</h1>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-ink">Email</span>
        <input name="email" type="email" autoComplete="email" required className="field-sm" />
      </label>
      {mode === "login" && (
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="field-sm" />
        </label>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {notice && <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-strong">{notice}</p>}
      <button type="submit" disabled={busy} className={button("primary", "h-10 w-full")}>
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        {mode === "login" ? "Sign in" : "Send reset link"}
      </button>
      <button type="button" onClick={() => setMode(mode === "login" ? "reset" : "login")} className="text-xs text-ink-soft hover:text-accent">
        {mode === "login" ? "Forgot password?" : "Back to sign in"}
      </button>
    </form>
  );
}
