"use client";

import { AnimatePresence, motion } from "motion/react";
import { Briefcase, ChevronDown, CircleCheck, Clock, IndianRupee, LoaderCircle, MapPin, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { isValidPhone } from "@/lib/leads";
import type { Job } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const MAX_MB = 5;

export function JobBoard({ jobs }: { jobs: Job[] }) {
  const [open, setOpen] = useState<string | null>(jobs[0]?.id ?? null);
  const [applyFor, setApplyFor] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  function apply(slug: string) {
    setApplyFor(slug);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        {jobs.length === 0 && (
          <p className="rounded-[24px] border border-dashed border-line p-8 text-center text-ink-soft">
            No openings right now — but we&apos;re always happy to meet good people. Send a general application.
          </p>
        )}
        {jobs.map((j) => {
          const isOpen = open === j.id;
          return (
            <article key={j.id} className="overflow-hidden rounded-[24px] border border-line bg-surface">
              <button
                onClick={() => setOpen(isOpen ? null : j.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-4 p-6 text-left"
              >
                <div>
                  <p className="text-xs font-semibold tracking-wide text-accent uppercase">{j.department}</p>
                  <h3 className="mt-1 font-display text-xl text-ink sm:text-2xl">{j.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
                    <Meta icon={<MapPin className="size-4" strokeWidth={1.5} />}>{j.location}</Meta>
                    <Meta icon={<Clock className="size-4" strokeWidth={1.5} />}>{j.employmentType}</Meta>
                    {j.experience && <Meta icon={<Briefcase className="size-4" strokeWidth={1.5} />}>{j.experience}</Meta>}
                    {j.salary && <Meta icon={<IndianRupee className="size-4" strokeWidth={1.5} />}>{j.salary}</Meta>}
                  </div>
                </div>
                <ChevronDown className={`mt-1 size-5 shrink-0 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-line px-6 pt-5 pb-6">
                      <p className="leading-relaxed text-ink-soft">{j.description}</p>
                      <JobList title="What you'll do" items={j.responsibilities} />
                      <JobList title="What we're looking for" items={j.requirements} />
                      <Button className="mt-6" arrow onClick={() => apply(j.slug)}>
                        Apply for this role
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>

      <div ref={formRef} className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
        <ApplicationForm jobs={jobs} value={applyFor} onChange={setApplyFor} />
      </div>
    </div>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {children}
    </span>
  );
}

function JobList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-soft">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApplicationForm({ jobs, value, onChange }: { jobs: Job[]; value: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs: Record<string, string> = {};
    if (String(fd.get("name") ?? "").trim().length < 2) errs.name = "Please enter your name";
    if (!isValidPhone(String(fd.get("phone") ?? ""))) errs.phone = "Enter a valid 10-digit mobile number";
    const file = fd.get("resume");
    if (file instanceof File && file.size > MAX_MB * 1024 * 1024) errs.resume = `Resume must be under ${MAX_MB} MB`;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus("sending");
    const res = await fetch("/api/careers/apply", { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setStatus("idle");
      toast({ title: "Couldn't send application", text: data?.error ?? "Please try again in a moment." });
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center rounded-[24px] border border-line bg-surface p-10 text-center shadow-soft">
        <span className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
          <CircleCheck className="size-8" strokeWidth={1.5} />
        </span>
        <h3 className="mt-5 text-2xl text-ink">Application received</h3>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">Thank you! Our team will review it and call you if your profile matches.</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-6"
          onClick={() => {
            setStatus("idle");
            setFileName("");
          }}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative grid gap-4 rounded-[24px] border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div>
        <p className="eyebrow">Apply now</p>
        <h3 className="mt-2 text-2xl text-ink">Send your application</h3>
      </div>
      {/* Honeypot for bots — hidden from people and screen readers */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      <Field label="Position">
        <select name="job" value={value} onChange={(e) => onChange(e.target.value)} className="field appearance-none">
          <option value="">General application</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.slug}>
              {j.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Full name" error={errors.name}>
        <input name="name" autoComplete="name" className="field" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile number" error={errors.phone}>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" className="field" />
        </Field>
        <Field label="Email (optional)">
          <input name="email" type="email" autoComplete="email" className="field" />
        </Field>
      </div>
      <Field label="Experience">
        <input name="experience" placeholder="e.g. 2 years in property sales" className="field" />
      </Field>
      <Field label="Resume (PDF or Word, max 5 MB)" error={errors.resume}>
        <span className="field flex cursor-pointer items-center gap-2 text-ink-soft">
          <Paperclip className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{fileName || "Choose file…"}</span>
          <input
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="sr-only"
          />
        </span>
      </Field>
      <Field label="Anything else? (optional)">
        <textarea name="message" rows={3} className="field resize-none" />
      </Field>
      <Button type="submit" size="lg" arrow={status !== "sending"} disabled={status === "sending"}>
        {status === "sending" && <LoaderCircle className="size-4 animate-spin" />}
        {status === "sending" ? "Sending…" : "Submit application"}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
