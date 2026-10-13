"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { isValidPhone, submitLead } from "@/lib/leads";
import { whatsappLink } from "@/lib/site";
import type { Lead, LeadInterest } from "@/lib/types";
import { Button, ButtonA } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { useToast } from "@/components/ui/Toast";
import { useSite } from "@/components/layout/SiteProvider";

const interests: LeadInterest[] = [
  "Buy Property",
  "Sell Property",
  "Rent",
  "Home Loan",
  "Vehicle Loan",
  "Loan Against Property",
  "Other",
];

/**
 * Reusable lead-capture form. Every submission goes through `submitLead`
 * → `/api/leads` → Supabase CRM + email alerts.
 */
export function LeadForm({
  source,
  defaultInterest = "Buy Property",
  propertyId,
  compact = false,
  extra,
  submitLabel = "Request a callback",
}: {
  source: string;
  defaultInterest?: LeadInterest;
  propertyId?: string;
  compact?: boolean;
  extra?: { callbackSlot?: string };
  submitLabel?: string;
}) {
  const s = useSite();
  const toast = useToast();
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ref, setRef] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const lead: Lead = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || undefined,
      interest: fd.get("interest") as LeadInterest,
      budget: String(fd.get("budget") ?? "") || undefined,
      message: String(fd.get("message") ?? "").trim() || undefined,
      callbackSlot: extra?.callbackSlot,
      source,
      propertyId,
    };
    const errs: Record<string, string> = {};
    if (lead.name.length < 2) errs.name = "Please enter your name";
    if (!isValidPhone(lead.phone)) errs.phone = "Enter a valid 10-digit mobile number";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");
    const res = await submitLead({ ...lead, website: String(fd.get("website") ?? "") });
    if (!res.ok) {
      setStatus("idle");
      toast({ title: "Couldn't send your request", text: res.error });
      return;
    }
    setRef(res.id);
    setStatus("done");
    toast({ title: "Request received", text: "Our advisor will call you shortly." });
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "done" ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-10 text-center"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
            className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent"
          >
            <CircleCheck className="size-8" strokeWidth={1.5} />
          </motion.span>
          <h3 className="mt-5 text-2xl text-ink">Thank you!</h3>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            We&apos;ve received your request. An advisor will reach out within working hours.
          </p>
          {ref && <p className="mt-2 text-xs text-ink-soft">Reference: <strong className="text-ink">{ref}</strong></p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ButtonA href={whatsappLink(s, `Hi! I just submitted an enquiry on your website${ref ? ` (ref ${ref})` : ""}.`)} target="_blank" rel="noreferrer" variant="outline" size="sm" icon={<WhatsAppIcon className="size-4 text-wa" />}>
              Chat now
            </ButtonA>
            <Button variant="ghost" size="sm" onClick={() => setStatus("idle")}>
              Send another
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={onSubmit}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          {/* Honeypot for bots — hidden from people and screen readers */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
          <Field label="Full name" error={errors.name}>
            <input name="name" autoComplete="name" placeholder="Your name" className="field" />
          </Field>
          <Field label="Mobile number" error={errors.phone}>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className="field" />
          </Field>
          {!compact && (
            <Field label="Email (optional)">
              <input name="email" type="email" autoComplete="email" placeholder="you@example.com" className="field" />
            </Field>
          )}
          <Field label="I'm interested in" className={compact ? "sm:col-span-2" : ""}>
            <select name="interest" defaultValue={defaultInterest} className="field appearance-none">
              {interests.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          {!compact && (
            <>
              <Field label="Budget / loan amount" className="sm:col-span-2">
                <select name="budget" defaultValue="" className="field appearance-none">
                  <option value="">Select a range</option>
                  <option>Under ₹25 L</option>
                  <option>₹25 L – ₹50 L</option>
                  <option>₹50 L – ₹1 Cr</option>
                  <option>₹1 Cr – ₹3 Cr</option>
                  <option>Above ₹3 Cr</option>
                </select>
              </Field>
              <Field label="Message" className="sm:col-span-2">
                <textarea name="message" rows={3} placeholder="Tell us a little about what you need…" className="field resize-none" />
              </Field>
            </>
          )}
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-soft">By submitting you agree to be contacted by our team.</p>
            <Button type="submit" size="lg" arrow={status !== "sending"} disabled={status === "sending"}>
              {status === "sending" && <LoaderCircle className="size-4 animate-spin" />}
              {status === "sending" ? "Sending…" : submitLabel}
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 block text-xs text-red-600"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}
