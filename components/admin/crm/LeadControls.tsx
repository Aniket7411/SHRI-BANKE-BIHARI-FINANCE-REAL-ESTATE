"use client";

import { motion } from "motion/react";
import { LoaderCircle, Mail, Phone } from "lucide-react";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { LEAD_STATUSES } from "@/lib/admin/meta";
import { telHref, waHref } from "@/lib/admin/crm-meta";
import type { ActionResult } from "@/lib/admin/form";
import { assignLead, setLeadStatus } from "@/app/admin/(panel)/leads/actions";

/**
 * Native <select> that runs a Server Action as soon as the value changes.
 * Optimistic, reverts on failure, toasts the result and shows a spinner while pending.
 */
export function ActionSelect({
  action,
  name,
  value,
  fields,
  options,
  label,
  className = "",
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  name: string;
  value: string;
  fields: Record<string, string>;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setCurrent(value);
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        aria-label={label}
        title={label}
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setCurrent(next);
          start(async () => {
            const fd = new FormData();
            for (const [k, v] of Object.entries(fields)) fd.set(k, v);
            fd.set(name, next);
            try {
              const res = await action(fd);
              if (res.message) toast({ title: res.message, tone: res.ok ? "success" : "error" });
              if (!res.ok) setCurrent(value);
            } catch {
              toast({ title: "Something went wrong. Please try again.", tone: "error" });
              setCurrent(value);
            }
          });
        }}
        className={`field-sm h-9 !py-0 pr-8 text-[13px] ${pending ? "opacity-60" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <LoaderCircle className="pointer-events-none absolute top-1/2 right-7 size-3.5 -translate-y-1/2 animate-spin text-ink-soft" />}
    </span>
  );
}

const statusOptions = LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }));

export function StatusSelect({ id, status, className }: { id: string; status: string; className?: string }) {
  return <ActionSelect action={setLeadStatus} name="status" value={status} fields={{ id }} options={statusOptions} label="Change status" className={className} />;
}

export function AssignSelect({ id, assignedTo, staff, className }: { id: string; assignedTo: string | null; staff: { id: string; name: string }[]; className?: string }) {
  const options = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s.id, label: s.name }))];
  return <ActionSelect action={assignLead} name="assigned_to" value={assignedTo ?? ""} fields={{ id }} options={options} label="Assign to" className={className} />;
}

const round = "grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent active:scale-95";

/** One-tap call + WhatsApp (icon buttons). */
export function ContactIcons({ phone, name }: { phone: string; name: string }) {
  return (
    <>
      <a href={telHref(phone)} className={round} aria-label={`Call ${name}`} title={`Call ${phone}`}>
        <Phone className="size-4" strokeWidth={1.75} />
      </a>
      <a href={waHref(phone, `Namaste ${name.split(" ")[0]}, `)} target="_blank" rel="noopener" className={`${round} hover:!border-wa hover:!text-wa`} aria-label={`WhatsApp ${name}`} title="WhatsApp">
        <WhatsAppIcon className="size-4" />
      </a>
    </>
  );
}

/** Big labelled contact buttons for the lead detail page. */
export function ContactButtons({ phone, name, email }: { phone: string; name: string; email: string | null }) {
  const big = "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium transition active:scale-[0.98]";
  return (
    <div className="flex gap-2">
      <a href={telHref(phone)} className={`${big} bg-ink text-bg hover:bg-accent hover:text-accent-fg`}>
        <Phone className="size-4" /> Call
      </a>
      <a href={waHref(phone, `Namaste ${name.split(" ")[0]}, `)} target="_blank" rel="noopener" className={`${big} bg-wa text-white hover:opacity-90`}>
        <WhatsAppIcon className="size-4" /> WhatsApp
      </a>
      {email && (
        <a href={`mailto:${email}`} className={`${big} max-w-14 border border-line text-ink hover:border-accent hover:text-accent sm:max-w-none`} aria-label="Email">
          <Mail className="size-4" /> <span className="hidden sm:inline">Email</span>
        </a>
      )}
    </div>
  );
}

/** Subtle staggered entrance for list items. */
export function FadeIn({ i = 0, children, className = "", as = "div" }: { i?: number; children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.035, ease: "easeOut" }}>
      {children}
    </Comp>
  );
}
