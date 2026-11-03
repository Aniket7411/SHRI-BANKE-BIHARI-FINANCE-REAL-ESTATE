"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { button } from "@/components/admin/ui";
import { useToast } from "@/components/ui/Toast";
import { PasswordInput } from "@/components/admin/PasswordInput";
import { requestPasswordReset } from "./reset-actions";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ?? "");
  const [notice, setNotice] = useState("");
  const toast = useToast();
  const offline = !isSupabaseConfigured;

  const goNext = () => {
    const next = params.get("next");
    router.replace(next?.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    setError("");
    setNotice("");
    setBusy(true);
    const db = supabaseBrowser();
    if (mode === "reset") {
      if (offline) {
        setBusy(false);
        setError("The database isn't connected, so reset emails can't be sent.");
        return;
      }
      const res = await requestPasswordReset(email).catch(() => ({ ok: false, message: "Network error. Please try again." }));
      setBusy(false);
      if (res.ok) setNotice(res.message);
      else setError(res.message);
      return;
    }
    const { error } = await db.auth.signInWithPassword({ email, password: String(fd.get("password") ?? "") });
    if (error) {
      setBusy(false);
      const msg = error.message === "Invalid login credentials" ? "Wrong email or password." : error.message;
      setError(msg);
      toast({ title: msg, tone: "error" });
      return;
    }
    toast({ title: "Signed in", tone: "success" });
    goNext();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {offline && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Database not connected.</span> Add the Supabase keys to this server&apos;s environment variables and redeploy to sign in.
          </p>
        </div>
      )}
      <h1 className="text-xl font-semibold text-ink">{mode === "login" ? "Sign in" : "Reset password"}</h1>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-ink">Email</span>
        <input name="email" type="email" autoComplete="email" required className="field-sm" />
      </label>
      {mode === "login" && (
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-ink">Password</span>
          <PasswordInput name="password" autoComplete="current-password" required />
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
