"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, KeyRound, LoaderCircle, RefreshCw, ShieldCheck, UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { PasswordInput } from "@/components/admin/PasswordInput";
import { button } from "@/components/admin/ui";
import { waHref } from "@/lib/admin/crm-meta";
import { addMember, setMemberPassword, type Credentials, type CredentialsResult } from "@/app/admin/(panel)/team/actions";

/** Easy to read out and type on a phone: "Sbb-4821-kmtq" (no look-alike letters). */
function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const rand = new Uint32Array(8);
  crypto.getRandomValues(rand);
  const digits = Array.from(rand.slice(0, 4), (n) => n % 10).join("");
  const tail = Array.from(rand.slice(4), (n) => letters[n % letters.length]).join("");
  return `Sbb-${digits}-${tail}`;
}

function PasswordField({ value, onChange, error, autoFocus }: { value: string; onChange: (v: string) => void; error?: string; autoFocus?: boolean }) {
  return (
    <div>
      <span className="mb-1 flex items-center justify-between text-[13px] font-medium text-ink">
        Password
        <button
          type="button"
          onClick={() => onChange(generatePassword())}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          <RefreshCw className="size-3" /> Generate
        </button>
      </span>
      <PasswordInput
        name="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        autoFocus={autoFocus}
        aria-invalid={!!error}
        placeholder="At least 8 characters"
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        <span className="mt-1 block text-xs text-ink-soft">At least 8 characters, no spaces. You&apos;ll share it with them.</span>
      )}
    </div>
  );
}

/** Shown once after a login is created / a password is set: copy or WhatsApp the details. */
function CredentialsPanel({ c, title, onDone, doneLabel }: { c: Credentials; title: string; onDone: () => void; doneLabel: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const loginUrl = `${window.location.origin}/admin/login`;
  const message = `Hi ${c.name.split(" ")[0]}, your Shri Banke Bihari CRM login:\n\nLink: ${loginUrl}\nEmail: ${c.email}\nPassword: ${c.password}\n\nPlease keep it private.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy — select the details and copy them manually", tone: "error" });
    }
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="grid size-7 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <ShieldCheck className="size-4" />
        </span>
        {title}
      </p>
      <dl className="grid gap-2 rounded-xl border border-line bg-subtle p-3 text-sm">
        {[
          ["Login", loginUrl],
          ["Email", c.email],
          ["Password", c.password],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs text-ink-soft">{k}</dt>
            <dd className={`min-w-0 text-right break-all text-ink select-all ${k === "Password" ? "font-mono font-semibold" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-soft">This password isn&apos;t shown again. Share it now, privately.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={button("outline", "flex-1")}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy details"}
        </button>
        {c.phone && (
          <a href={waHref(c.phone, message)} target="_blank" rel="noopener" className={button("outline", "flex-1 hover:!border-wa hover:!text-wa")}>
            <WhatsAppIcon className="size-4" /> WhatsApp
          </a>
        )}
      </div>
      <button type="button" onClick={onDone} className={button("primary", "h-10 w-full")}>
        {doneLabel}
      </button>
    </motion.div>
  );
}

const EMPTY = { full_name: "", email: "", phone: "", role: "agent", password: "" };

/** Team page → "Add team member": the admin chooses the email and password. */
export function AddMemberCard() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Credentials | null>(null);
  const set = (k: keyof typeof EMPTY, val: string) => {
    setV((cur) => ({ ...cur, [k]: val }));
    if (errors[k]) setErrors((cur) => Object.fromEntries(Object.entries(cur).filter(([key]) => key !== k)));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (v.full_name.trim().length < 2) errs.full_name = "Enter their name";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errs.email = "Enter a valid email";
    if (v.password.length < 8) errs.password = "Use at least 8 characters";
    else if (/\s/.test(v.password)) errs.password = "No spaces, please";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    start(async () => {
      const fd = new FormData();
      for (const [k, val] of Object.entries(v)) fd.set(k, val);
      let res: CredentialsResult;
      try {
        res = await addMember(fd);
      } catch {
        res = { ok: false, message: "Something went wrong. Please try again." };
      }
      if (res.message) toast({ title: res.message, tone: res.ok ? "success" : "error" });
      if (!res.ok) return setErrors(res.errors ?? {});
      setCreated(res.credentials ?? null);
      setV(EMPTY);
    });
  };

  if (created) return <CredentialsPanel c={created} title={`Login ready for ${created.name}`} onDone={() => setCreated(null)} doneLabel="Add another member" />;

  const input = (k: "full_name" | "email" | "phone", label: string, type = "text", auto?: string) => (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink">{label}</span>
      <input value={v[k]} onChange={(e) => set(k, e.target.value)} type={type} autoComplete={auto} aria-invalid={!!errors[k]} className="field-sm" />
      {errors[k] && <span className="mt-1 block text-xs text-red-600">{errors[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-3">
      {input("full_name", "Full name", "text", "off")}
      {input("email", "Login email", "email", "off")}
      <PasswordField value={v.password} onChange={(val) => set("password", val)} error={errors.password} />
      {input("phone", "Mobile (optional — to WhatsApp the login)", "tel", "off")}
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-ink">Role</span>
        <select value={v.role} onChange={(e) => set("role", e.target.value)} className="field-sm">
          <option value="agent">Sales (own leads only)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </label>
      {errors.form && <p className="text-xs text-red-600">{errors.form}</p>}
      <button type="submit" disabled={pending} className={button("primary", "mt-1 h-10 w-full")}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        {pending ? "Creating…" : "Create login"}
      </button>
    </form>
  );
}

/** Key icon on a team row → set a new password for that member. */
export function SetPasswordButton({ id, name }: { id: string; name: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Credentials | null>(null);

  const close = () => {
    setOpen(false);
    setPassword("");
    setError("");
    setDone(null);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters");
    if (/\s/.test(password)) return setError("No spaces, please");
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("password", password);
      let res: CredentialsResult;
      try {
        res = await setMemberPassword(fd);
      } catch {
        res = { ok: false, message: "Something went wrong. Please try again." };
      }
      if (res.message) toast({ title: res.message, tone: res.ok ? "success" : "error" });
      if (!res.ok) return setError(res.errors?.password ?? res.message ?? "Couldn't set the password");
      setDone(res.credentials ?? null);
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Set a new password" aria-label={`Set a new password for ${name}`} className={button("ghost")}>
        <KeyRound className="size-4" />
      </button>
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center text-left sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`New password for ${name}`}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !pending && close()}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="relative w-full max-w-sm rounded-t-3xl bg-surface p-5 whitespace-normal shadow-2xl sm:rounded-3xl"
            >
              <button
                type="button"
                onClick={close}
                disabled={pending}
                aria-label="Close"
                className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-ink"
              >
                <X className="size-4" />
              </button>
              {done ? (
                <CredentialsPanel c={done} title={`New password set for ${done.name}`} onDone={close} doneLabel="Done" />
              ) : (
                <form onSubmit={submit} noValidate className="grid gap-4">
                  <div className="pr-8">
                    <p className="text-base font-semibold text-ink">New password for {name}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">Their old password stops working straight away.</p>
                  </div>
                  <PasswordField
                    value={password}
                    onChange={(val) => {
                      setPassword(val);
                      setError("");
                    }}
                    error={error}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={close} disabled={pending} className={button("outline", "h-10 flex-1")}>
                      Cancel
                    </button>
                    <button type="submit" disabled={pending} className={button("primary", "h-10 flex-1")}>
                      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                      {pending ? "Saving…" : "Set password"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
