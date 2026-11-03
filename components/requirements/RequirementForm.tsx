"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BellRing, Check, CircleAlert, LoaderCircle, MapPin, PartyPopper, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { isValidPhone } from "@/lib/leads";
import { BUDGETS, CATEGORIES, PROPERTY_TYPES, categoryOf, isPlot } from "@/lib/property-meta";
import { requirementSummary } from "@/lib/requirements";
import { whatsappLink } from "@/lib/site";
import type { PropertyCategory, Purpose } from "@/lib/types";
import { getUtm } from "@/lib/utm";
import { ButtonA } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { useCity } from "@/components/layout/CityProvider";
import { useSite } from "@/components/layout/SiteProvider";

export interface RequirementPrefill {
  purpose?: Purpose;
  city?: string;
  localities?: string[];
  category?: PropertyCategory | "";
  types?: string[];
  budget?: number; // index into BUDGETS[purpose]
  beds?: number[];
}

interface Contact {
  name: string;
  phone: string;
  email: string;
}

const CONTACT_KEY = "sbb:contact";
function loadContact(): Contact {
  try {
    const v = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? "{}");
    return { name: String(v.name ?? ""), phone: String(v.phone ?? ""), email: String(v.email ?? "") };
  } catch {
    return { name: "", phone: "", email: "" };
  }
}
function saveContact(c: Contact) {
  try {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(c));
  } catch {}
}

/** setState updater that drops one field error. */
const without = (key: string) => (errs: Record<string, string>) => Object.fromEntries(Object.entries(errs).filter(([k]) => k !== key));

const STEP_FIELDS: Record<string, 0 | 1> = { purpose: 0, city: 0, localities: 0, category: 0, types: 0, budgetMin: 0, budgetMax: 0, beds: 0 };

type Status = { kind: "edit" } | { kind: "sending" } | { kind: "done"; ref: string; alerts: boolean; updated: boolean } | { kind: "error"; message: string };

/**
 * Two-step "tell us what you need" form: what they want, then how to reach them.
 * Saves a requirement (and a CRM lead) through /api/requirements.
 */
export function RequirementForm({ prefill, source, onClose }: { prefill?: RequirementPrefill; source: string; onClose: () => void }) {
  const s = useSite();
  const { cities, city: pickedCity } = useCity();
  const [step, setStep] = useState<0 | 1>(0);
  const [status, setStatus] = useState<Status>({ kind: "edit" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [purpose, setPurpose] = useState<Purpose>(prefill?.purpose ?? "Buy");
  const [city, setCity] = useState(prefill?.city ?? pickedCity ?? (cities.length === 1 ? cities[0].name : ""));
  const [localities, setLocalities] = useState<string[]>(prefill?.localities ?? []);
  const [category, setCategory] = useState<PropertyCategory | "">(prefill?.category || (prefill?.types?.length ? categoryOf(prefill.types[0]) : "Residential"));
  const [types, setTypes] = useState<string[]>(prefill?.types ?? []);
  const [budget, setBudget] = useState(prefill?.budget ?? -1);
  const [beds, setBeds] = useState<number[]>(prefill?.beds ?? []);
  const [contact, setContact] = useState<Contact>(() => (typeof window === "undefined" ? { name: "", phone: "", email: "" } : loadContact()));
  const [notes, setNotes] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [honeypot, setHoneypot] = useState("");

  const cityLocalities = cities.find((c) => c.name === city)?.localities ?? [];
  const typeOptions = category ? PROPERTY_TYPES[category] : [...new Set([...PROPERTY_TYPES.Residential, ...types])];
  const showBeds = category !== "Commercial" && !(types.length && types.every(isPlot));
  const range = budget >= 0 ? BUDGETS[purpose][budget] : undefined;
  const criteria = {
    purpose,
    city,
    localities,
    category,
    types,
    budget_min: range?.min ?? null,
    budget_max: range?.max ?? null,
    beds: showBeds ? beds : [],
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const setField = (k: keyof Contact, v: string) => {
    setContact((c) => ({ ...c, [k]: v }));
    if (errors[k]) setErrors(without(k));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (contact.name.trim().length < 2) errs.name = "Please enter your name";
    if (!isValidPhone(contact.phone)) errs.phone = "Enter a valid 10-digit mobile number";
    if (contact.email.trim() && !/^\S+@\S+\.\S+$/.test(contact.email.trim())) errs.email = "Enter a valid email, or leave it blank";
    if (alerts && !contact.email.trim()) errs.email = "Add your email to receive alerts (or switch alerts off)";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          purpose,
          city,
          localities,
          category,
          types,
          budgetMin: criteria.budget_min,
          budgetMax: criteria.budget_max,
          beds: criteria.beds,
          notes: notes.trim(),
          alerts,
          source,
          utm: getUtm(),
          website: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const issues = (data.issues ?? {}) as Record<string, string>;
        setErrors(issues);
        // Send them back to the step that has the problem.
        if (Object.keys(issues).some((k) => STEP_FIELDS[k] === 0)) setStep(0);
        setStatus({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      saveContact({ name: contact.name.trim(), phone: contact.phone.trim(), email: contact.email.trim() });
      setStatus({ kind: "done", ref: data.ref, alerts: Boolean(data.alerts), updated: Boolean(data.updated) });
    } catch {
      setStatus({ kind: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  if (status.kind === "done") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center px-6 pt-10 pb-8 text-center sm:px-10 sm:pt-12">
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 }}
          className="grid size-18 place-items-center rounded-full bg-accent-soft text-accent"
        >
          <PartyPopper className="size-8" strokeWidth={1.5} />
        </motion.span>
        <h2 className="mt-5 text-[1.7rem] leading-tight text-ink">{status.updated ? "Requirement updated!" : "Requirement saved!"}</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          Thank you, {contact.name.trim().split(" ")[0]}. An advisor will call you with options within working hours.
          {status.alerts && contact.email.trim() && (
            <>
              {" "}
              We&apos;ll email <strong className="text-ink">{contact.email.trim()}</strong> when a matching property is listed.
            </>
          )}
        </p>
        <div className="mt-5 w-full max-w-sm rounded-2xl border border-line bg-subtle/60 p-4 text-left">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft uppercase">Your requirement · {status.ref}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{requirementSummary(criteria)}</p>
          {status.alerts && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent">
              <BellRing className="size-3.5" /> New-listing alerts on
            </p>
          )}
        </div>
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
          <ButtonA
            href={whatsappLink(s, `Hi! I just saved my property requirement (${status.ref}) on your website.`)}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-wa text-white hover:bg-wa/90"
            icon={<WhatsAppIcon className="size-4" />}
          >
            Chat now
          </ButtonA>
          <Link href="/properties" onClick={onClose} className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink/25 px-5 text-sm font-medium text-ink transition hover:border-accent hover:text-accent">
            Browse properties
          </Link>
        </div>
        <button onClick={onClose} className="mt-4 text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          Close
        </button>
      </motion.div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form onSubmit={step === 0 ? (e) => (e.preventDefault(), setStep(1)) : submit} noValidate className="flex flex-col">
      {/* Honeypot for bots — hidden from people and screen readers */}
      <input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />

      <div className="px-5 pt-6 pr-16 sm:px-8 sm:pt-8">
        <p className="eyebrow">{step === 0 ? "Step 1 of 2" : "Step 2 of 2"}</p>
        <h2 className="mt-2 text-[clamp(1.45rem,4vw,1.9rem)] leading-tight text-ink">{step === 0 ? "What are you looking for?" : "Where can we reach you?"}</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          {step === 0 ? "Tell us once — we'll shortlist options and alert you when a matching property is listed." : "We'll call with options. No spam, ever."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-1.5" aria-hidden>
          {[0, 1].map((i) => (
            <span key={i} className="h-1 overflow-hidden rounded-full bg-line">
              <motion.span className="block h-full bg-accent" initial={false} animate={{ width: step >= i ? "100%" : "0%" }} transition={{ duration: 0.35 }} />
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === 0 ? (
          <motion.div key="what" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="grid gap-5 px-5 py-5 sm:px-8">
            <Group label="I want to">
              <div className="grid grid-cols-2 rounded-2xl bg-subtle p-1">
                {(["Buy", "Rent"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPurpose(p);
                      setBudget(-1);
                    }}
                    aria-pressed={purpose === p}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition ${purpose === p ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
                  >
                    {p === "Buy" ? "Buy" : "Rent"}
                  </button>
                ))}
              </div>
            </Group>

            {cities.length > 0 && (
              <Group label="City">
                <div className="flex flex-wrap gap-2">
                  {cities.length > 1 && (
                    <Chip on={!city} onClick={() => (setCity(""), setLocalities([]))}>
                      Any city
                    </Chip>
                  )}
                  {cities.map((c) => (
                    <Chip key={c.name} on={city === c.name} onClick={() => (setCity(c.name), setLocalities([]))}>
                      <MapPin className="size-3.5" strokeWidth={1.75} /> {c.name}
                    </Chip>
                  ))}
                </div>
              </Group>
            )}

            {cityLocalities.length > 0 && (
              <Group label="Preferred localities" hint="Optional · pick any">
                <div className="no-scrollbar -mx-1 flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto px-1">
                  {cityLocalities.map((l) => (
                    <Chip key={l} small on={localities.includes(l)} onClick={() => setLocalities(toggle(localities, l))}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Group>
            )}

            <Group label="Property category">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip key={c.value} on={category === c.value} onClick={() => (setCategory(c.value), setTypes(types.filter((t) => PROPERTY_TYPES[c.value].includes(t))))}>
                    {c.value}
                  </Chip>
                ))}
              </div>
            </Group>

            <Group label="Property type" hint="Optional · leave blank for any">
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((t) => (
                  <Chip key={t} small on={types.includes(t)} onClick={() => setTypes(toggle(types, t))}>
                    {types.includes(t) && <Check className="size-3.5" strokeWidth={2.5} />}
                    {t}
                  </Chip>
                ))}
              </div>
            </Group>

            <Group label={purpose === "Rent" ? "Monthly rent" : "Budget"}>
              <div className="flex flex-wrap gap-2">
                {BUDGETS[purpose].map((b, i) => (
                  <Chip key={b.label} small on={budget === i} onClick={() => setBudget(budget === i ? -1 : i)}>
                    {b.label}
                  </Chip>
                ))}
              </div>
            </Group>

            {showBeds && (
              <Group label="Bedrooms" hint="Optional">
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Chip key={n} small on={beds.includes(n)} onClick={() => setBeds(toggle(beds, n))}>
                      {n === 5 ? "5+ BHK" : `${n} BHK`}
                    </Chip>
                  ))}
                </div>
              </Group>
            )}
          </motion.div>
        ) : (
          <motion.div key="who" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-8">
            <div className="rounded-2xl border border-line bg-subtle/60 px-4 py-3 sm:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-ink">{requirementSummary(criteria)}</p>
                <button type="button" onClick={() => setStep(0)} className="shrink-0 text-xs font-semibold text-accent hover:underline">
                  Edit
                </button>
              </div>
            </div>
            <Input label="Full name" error={errors.name}>
              <input value={contact.name} onChange={(e) => setField("name", e.target.value)} autoComplete="name" placeholder="Your name" className="field" aria-invalid={!!errors.name} />
            </Input>
            <Input label="Mobile number" error={errors.phone}>
              <input value={contact.phone} onChange={(e) => setField("phone", e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className="field" aria-invalid={!!errors.phone} />
            </Input>
            <Input label={alerts ? "Email (for alerts)" : "Email (optional)"} error={errors.email} className="sm:col-span-2">
              <input value={contact.email} onChange={(e) => setField("email", e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" className="field" aria-invalid={!!errors.email} />
            </Input>
            <Input label="Anything else?" hint="Optional" className="sm:col-span-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. near a school, ground floor, east facing, ready to move…" className="field resize-none" />
            </Input>
            <button
              type="button"
              onClick={() => {
                setAlerts(!alerts);
                if (errors.email) setErrors(without("email"));
              }}
              aria-pressed={alerts}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition sm:col-span-2 ${alerts ? "border-accent/60 bg-accent-soft/50" : "border-line hover:bg-subtle"}`}
            >
              <span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${alerts ? "bg-accent" : "bg-line"}`}>
                <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition ${alerts ? "translate-x-4" : ""}`} />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <BellRing className="size-4 text-accent" strokeWidth={1.75} /> Notify me about new matching properties
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">By email when a matching listing goes live. Stop any time from the link in the email.</span>
              </span>
            </button>
            <p className="text-xs text-ink-soft sm:col-span-2">
              By saving, you agree to be contacted about your requirement. See our{" "}
              <Link href="/privacy" target="_blank" className="font-medium text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status.kind === "error" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-5 sm:px-8">
            <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
              <CircleAlert className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Couldn&apos;t save your requirement</p>
                <p className="mt-0.5 text-[13px] opacity-90">{status.message}</p>
                <a href={whatsappLink(s, `Hi! I'm looking for: ${requirementSummary(criteria)}`)} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold underline-offset-4 hover:underline">
                  Send it on WhatsApp instead →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:px-8">
        {step === 1 ? (
          <button type="button" onClick={() => setStep(0)} disabled={sending} className="inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink-soft transition hover:bg-subtle hover:text-ink disabled:opacity-50">
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : (
          <p className="hidden text-xs text-ink-soft sm:block">Takes under a minute</p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="ml-auto inline-flex h-12 min-w-[9.5rem] items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-bg transition hover:bg-accent hover:text-accent-fg active:scale-[0.97] disabled:pointer-events-none disabled:opacity-70 max-sm:flex-1"
        >
          {sending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Saving…
            </>
          ) : step === 0 ? (
            <>
              Continue <ArrowRight className="size-4" />
            </>
          ) : status.kind === "error" ? (
            <>
              <RotateCcw className="size-4" /> Try again
            </>
          ) : (
            <>
              <BellRing className="size-4" /> Save requirement
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-baseline gap-2 text-[13px] font-semibold text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-ink-soft">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Chip({ on, onClick, small, children }: { on: boolean; onClick: () => void; small?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition active:scale-[0.97] ${small ? "px-3 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm"} ${
        on ? "border-accent bg-accent text-accent-fg shadow-soft" : "border-line bg-surface text-ink hover:border-accent/60"
      }`}
    >
      {children}
    </button>
  );
}

function Input({ label, hint, error, className = "", children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-baseline gap-2 text-[13px] font-medium text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-ink-soft">{hint}</span>}
      </span>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-1 block text-xs text-red-600">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}
