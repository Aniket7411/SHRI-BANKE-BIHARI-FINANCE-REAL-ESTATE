"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellOff, BellRing, Check, CircleAlert, LoaderCircle, Mail, MailCheck, Phone, Send } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ActionSelect } from "@/components/admin/crm/LeadControls";
import { fmtDate, timeAgo } from "@/lib/admin/meta";
import { initials, telHref } from "@/lib/admin/crm-meta";
import { REQUIREMENT_STATUSES } from "@/lib/requirements";
import { logWhatsAppAlert, sendPropertyAlerts, setRequirementAlerts, setRequirementStatus, type AlertOutcome } from "@/app/admin/(panel)/requirements/actions";

const statusOptions = REQUIREMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }));

export function RequirementStatusSelect({ id, status, className }: { id: string; status: string; className?: string }) {
  return <ActionSelect action={setRequirementStatus} name="status" value={status} fields={{ id }} options={statusOptions} label="Requirement status" className={className} />;
}

/** On/off switch for a requirement's new-listing alerts. */
export function AlertsSwitch({ id, alerts }: { id: string; alerts: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(alerts);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      onClick={() =>
        start(async () => {
          const next = !on;
          setOn(next);
          const fd = new FormData();
          fd.set("id", id);
          fd.set("alerts", String(next));
          try {
            const res = await setRequirementAlerts(fd);
            if (res.message) toast({ title: res.message, tone: res.ok ? "success" : "error" });
            if (!res.ok) setOn(!next);
          } catch {
            setOn(!next);
            toast({ title: "Something went wrong. Please try again.", tone: "error" });
          }
        })
      }
      className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:bg-subtle disabled:opacity-70"
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-line"}`}>
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{on ? "Alerts on" : "Alerts off"}</span>
        <span className="block text-xs text-ink-soft">{on ? "Can be emailed about new matching listings" : "Won't be emailed about new listings"}</span>
      </span>
      {pending && <LoaderCircle className="size-4 animate-spin text-ink-soft" />}
    </button>
  );
}

/** WhatsApp link that opens the chat with a prepared message and logs the alert. */
export function WhatsAppAlertButton({
  propertyId,
  requirementId,
  href,
  sentAt,
  compact = false,
  onLogged,
}: {
  propertyId: string;
  requirementId: string;
  href: string;
  sentAt?: string;
  compact?: boolean;
  onLogged?: () => void;
}) {
  const toast = useToast();
  const [done, setDone] = useState(Boolean(sentAt));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={() => {
        // Let the link open straight away; log in the background.
        logWhatsAppAlert(propertyId, requirementId)
          .then((res) => {
            if (!res.ok) return toast({ title: res.message ?? "Couldn't log the WhatsApp alert", tone: "error" });
            setDone(true);
            onLogged?.();
          })
          .catch(() => toast({ title: "Couldn't log the WhatsApp alert", tone: "error" }));
      }}
      title={done ? "Sent on WhatsApp — send again" : "Send on WhatsApp"}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border text-[13px] font-medium transition active:scale-95 ${compact ? "w-9" : "px-3"} ${
        done ? "border-wa/40 bg-wa/10 text-wa" : "border-line text-ink hover:border-wa hover:text-wa"
      }`}
    >
      <WhatsAppIcon className="size-4" />
      {!compact && (done ? "Sent" : "WhatsApp")}
      {done && !compact && <Check className="size-3.5" strokeWidth={2.5} />}
    </a>
  );
}

const OUTCOME_LABEL: Record<AlertOutcome, string> = {
  sent: "Emailed",
  already: "Already emailed",
  no_email: "No email",
  alerts_off: "Alerts off",
  closed: "Closed",
  no_match: "No longer matches",
  failed: "Email failed",
  missing: "Not found",
};

/** One requirement × one property: email (admins) and WhatsApp. */
export function SingleAlertActions({
  propertyId,
  requirementId,
  canEmail,
  blockedReason,
  emailedAt,
  whatsappAt,
  waLink,
}: {
  propertyId: string;
  requirementId: string;
  canEmail: boolean;
  blockedReason?: string;
  emailedAt?: string;
  whatsappAt?: string;
  waLink: string;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [emailed, setEmailed] = useState(emailedAt);
  return (
    <div className="flex items-center gap-2">
      {canEmail &&
        (emailed ? (
          <span title={`Emailed ${fmtDate(emailed, true)}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <MailCheck className="size-4" /> Emailed
          </span>
        ) : (
          <button
            type="button"
            disabled={pending || !!blockedReason}
            title={blockedReason ?? "Email this property"}
            onClick={() =>
              start(async () => {
                try {
                  const res = await sendPropertyAlerts(propertyId, [requirementId]);
                  toast({ title: res.message ?? (res.ok ? "Sent" : "Not sent"), tone: res.ok ? "success" : "error" });
                  if (res.outcomes[requirementId] === "sent" || res.outcomes[requirementId] === "already") setEmailed(new Date().toISOString());
                } catch {
                  toast({ title: "Couldn't send the email. Please try again.", tone: "error" });
                }
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-medium text-bg transition hover:bg-accent hover:text-accent-fg active:scale-95 disabled:opacity-40"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}
            {pending ? "Sending…" : "Email"}
          </button>
        ))}
      <WhatsAppAlertButton propertyId={propertyId} requirementId={requirementId} href={waLink} sentAt={whatsappAt} />
    </div>
  );
}

export interface PickerRow {
  id: string;
  ref: string;
  name: string;
  phone: string;
  email: string | null;
  alerts: boolean;
  status: string;
  summary: string;
  createdAt: string;
  emailedAt?: string;
  whatsappAt?: string;
  waLink: string;
}

const blockReason = (r: PickerRow) => (!r.alerts ? "Alerts off" : !r.email ? "No email" : r.emailedAt ? "Already emailed" : null);

/**
 * On a property: everyone whose requirement it matches. Tick people and email
 * the listing in one go, or WhatsApp them one by one.
 */
export function AlertPicker({ propertyId, rows, published }: { propertyId: string; rows: PickerRow[]; published: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [emailed, setEmailed] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, AlertOutcome>>({});
  const list = useMemo(() => rows.map((r) => ({ ...r, emailedAt: emailed[r.id] ?? r.emailedAt })), [rows, emailed]);
  const eligible = list.filter((r) => !blockReason(r)).map((r) => r.id);
  const [picked, setPicked] = useState<string[]>(eligible);
  const selected = picked.filter((id) => eligible.includes(id));
  const all = eligible.length > 0 && selected.length === eligible.length;
  const [error, setError] = useState("");

  const send = () => {
    if (!selected.length) return;
    if (!window.confirm(`Email this property to ${selected.length} ${selected.length === 1 ? "person" : "people"}?`)) return;
    setError("");
    start(async () => {
      try {
        const res = await sendPropertyAlerts(propertyId, selected);
        setOutcomes(res.outcomes);
        const now = new Date().toISOString();
        setEmailed((cur) => ({ ...cur, ...Object.fromEntries(Object.entries(res.outcomes).filter(([, o]) => o === "sent" || o === "already").map(([id]) => [id, now])) }));
        setPicked([]);
        toast({ title: res.message ?? (res.ok ? "Alerts sent" : "No alerts sent"), tone: res.ok ? "success" : "error" });
        if (!res.ok) setError(res.message ?? "No alerts were sent.");
      } catch {
        setError("Couldn't send alerts — check your connection and try again.");
        toast({ title: "Couldn't send alerts", tone: "error" });
      }
    });
  };

  if (!rows.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-subtle px-4 py-3.5 text-sm text-ink-soft">
        <BellOff className="size-4 shrink-0" /> No saved requirements match this property yet. New requirements are checked against it automatically.
      </div>
    );
  }

  return (
    <div>
      {!published && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> Publish this property before notifying people — the link in the alert won&apos;t open while it&apos;s a draft or sold.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-subtle px-3 py-2.5">
        <label className={`flex items-center gap-2 text-[13px] font-medium text-ink ${eligible.length ? "cursor-pointer" : "opacity-50"}`}>
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={all} disabled={!eligible.length || pending} onChange={() => setPicked(all ? [] : eligible)} />
          {all ? "All selected" : "Select all"}
        </label>
        <span className="text-xs text-ink-soft">
          {selected.length} of {eligible.length} can be emailed
        </span>
        <button
          type="button"
          onClick={send}
          disabled={!selected.length || pending || !published}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg transition hover:bg-accent hover:text-accent-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          {pending ? "Sending…" : selected.length ? `Email ${selected.length} ${selected.length === 1 ? "person" : "people"}` : "Email selected"}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="alert" className="mt-2 text-[13px] text-red-600">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <ul className="mt-2 divide-y divide-line">
        {list.map((r) => {
          const blocked = blockReason(r);
          const outcome = outcomes[r.id];
          return (
            <li key={r.id} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center">
              <label className={`flex min-w-0 flex-1 items-start gap-3 ${blocked ? "" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  className="mt-3 size-4 shrink-0 accent-[var(--accent)]"
                  disabled={!!blocked || pending}
                  checked={!blocked && picked.includes(r.id)}
                  onChange={() => setPicked((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]))}
                  aria-label={`Select ${r.name}`}
                />
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">{initials(r.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/admin/requirements/${r.id}`} className="truncate font-medium text-ink hover:text-accent">
                      {r.name}
                    </Link>
                    <span className="text-xs text-ink-soft">{r.ref}</span>
                    {r.emailedAt && (
                      <span title={fmtDate(r.emailedAt, true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <MailCheck className="size-3" /> Emailed
                      </span>
                    )}
                    {r.whatsappAt && (
                      <span title={fmtDate(r.whatsappAt, true)} className="inline-flex items-center gap-1 rounded-full bg-wa/10 px-2 py-0.5 text-[11px] font-semibold text-wa">
                        <WhatsAppIcon className="size-3" /> WhatsApp
                      </span>
                    )}
                    {blocked && blocked !== "Already emailed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {blocked === "Alerts off" ? <BellOff className="size-3" /> : <Mail className="size-3" />} {blocked}
                      </span>
                    )}
                    {outcome && outcome !== "sent" && outcome !== "already" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                        <CircleAlert className="size-3" /> {OUTCOME_LABEL[outcome]}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{r.summary}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    {r.phone}
                    {r.email && ` · ${r.email}`} · asked {timeAgo(r.createdAt)}
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-2 pl-[4.25rem] sm:pl-0">
                <a href={telHref(r.phone)} title={`Call ${r.phone}`} aria-label={`Call ${r.name}`} className="grid size-9 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent">
                  <Phone className="size-4" strokeWidth={1.75} />
                </a>
                <WhatsAppAlertButton propertyId={propertyId} requirementId={r.id} href={r.waLink} sentAt={r.whatsappAt} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
        <BellRing className="size-3.5" /> Each person is emailed about a property only once. WhatsApp opens a ready-made message and logs it.
      </p>
    </div>
  );
}
