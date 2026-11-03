"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, PhoneCall, Save, StickyNote, X } from "lucide-react";
import { useState } from "react";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/admin/forms";
import { Sheet } from "@/components/ui/Sheet";
import { button } from "@/components/admin/ui";
import { CALL_OUTCOMES, CLOSING_OUTCOMES, istInputInDays, type CallOutcome } from "@/lib/admin/crm-meta";
import { addNote, logCall, setFollowUp } from "@/app/admin/(panel)/leads/actions";

const PRESETS = [
  { key: "1", label: "Tomorrow", days: 1 },
  { key: "3", label: "3 days", days: 3 },
  { key: "7", label: "1 week", days: 7 },
] as const;
type Mode = (typeof PRESETS)[number]["key"] | "custom" | "none";

const chip = (on: boolean) =>
  `inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition active:scale-95 ${
    on ? "border-ink bg-ink text-bg" : "border-line text-ink-soft hover:border-accent hover:text-accent"
  }`;

/**
 * Follow-up picker: quick chips (Tomorrow / 3 days / 1 week), custom date-time (IST) or none.
 * Submits a datetime-local value under `name`.
 */
export function FollowUpField({
  name = "follow_up_at",
  value,
  mode,
  onChange,
  allowNone = true,
}: {
  name?: string;
  value: string;
  mode: Mode;
  onChange: (value: string, mode: Mode) => void;
  allowNone?: boolean;
}) {
  return (
    <div>
      <input type="hidden" name={name} value={mode === "none" ? "" : value} />
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" className={chip(mode === p.key)} onClick={() => onChange(istInputInDays(p.days), p.key)}>
            {p.label}
          </button>
        ))}
        <button type="button" className={chip(mode === "custom")} onClick={() => onChange(value || istInputInDays(1), "custom")}>
          <CalendarClock className="size-3.5" /> Custom
        </button>
        {allowNone && (
          <button type="button" className={chip(mode === "none")} onClick={() => onChange("", "none")}>
            None
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {mode !== "none" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <input
              type="datetime-local"
              aria-label="Follow-up date and time (IST)"
              value={value}
              onChange={(e) => onChange(e.target.value, "custom")}
              className="field-sm mt-2 sm:max-w-xs"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Suggested follow-up for each outcome. */
function presetFor(outcome: CallOutcome): Mode {
  if (CLOSING_OUTCOMES.includes(outcome)) return "none";
  if (outcome === "interested") return "3";
  if (outcome === "site_visit") return "custom";
  return "1";
}

/** The call-log form: outcome, notes, next follow-up. */
export function CallLogForm({ leadId, onDone, compact = false }: { leadId: string; onDone?: () => void; compact?: boolean }) {
  const [version, setVersion] = useState(0);
  return <CallLogInner key={version} leadId={leadId} compact={compact} onDone={() => (setVersion((v) => v + 1), onDone?.())} />;
}

function CallLogInner({ leadId, onDone, compact }: { leadId: string; onDone: () => void; compact: boolean }) {
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [follow, setFollow] = useState<{ value: string; mode: Mode }>({ value: "", mode: "none" });

  const pick = (o: CallOutcome) => {
    setOutcome(o);
    const m = presetFor(o);
    const days = PRESETS.find((p) => p.key === m)?.days;
    setFollow({ value: days ? istInputInDays(days) : m === "custom" ? follow.value || istInputInDays(1, 16) : "", mode: m });
  };

  return (
    <ActionForm action={logCall} onSuccess={onDone} className="grid gap-4">
      <input type="hidden" name="id" value={leadId} />
      <input type="hidden" name="outcome" value={outcome} />
      <Field label="How did the call go?" name="outcome">
        <div className={`grid grid-cols-2 gap-2 ${compact ? "" : "sm:grid-cols-4"}`} role="radiogroup">
          {CALL_OUTCOMES.map((o) => {
            const on = outcome === o.value;
            const danger = o.tone === "red";
            const good = o.tone === "green" || o.tone === "accent";
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(o.value)}
                className={`relative min-h-10 rounded-xl border px-3 py-2 text-left text-[13px] font-medium transition active:scale-[0.98] ${
                  on
                    ? danger
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : good
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "border-ink bg-subtle text-ink"
                    : "border-line text-ink-soft hover:border-accent hover:text-ink"
                }`}
              >
                {on && <motion.span layoutId={`call-dot-${leadId}`} className="absolute top-2 right-2 size-1.5 rounded-full bg-current" />}
                {o.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Notes" name="notes">
        <textarea name="notes" rows={compact ? 2 : 3} placeholder="Budget, preferred locality, documents pending, who to speak to…" className="field-sm resize-y" />
      </Field>
      <Field label="Next follow-up" name="follow_up_at" hint={follow.mode === "none" ? "No reminder will be set" : "Shown in your Follow-ups list (IST)"}>
        <FollowUpField value={follow.value} mode={follow.mode} onChange={(value, mode) => setFollow({ value, mode })} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton className="h-10 w-full sm:w-auto">
          <PhoneCall className="size-4" /> Save call
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

/** "Log call" button that opens the call log as a bottom sheet (phones) / dialog (desktop). */
export function LogCallButton({ leadId, leadName, className = "", label = "Log call" }: { leadId: string; leadName: string; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || button("outline", "h-9")}>
        <PhoneCall className="size-4" /> {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label={`Log call with ${leadName}`}>
        <div className="p-5 sm:p-7">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">Log call</p>
          <h2 className="mt-1 mb-5 pr-12 font-display text-2xl text-ink">{leadName}</h2>
          <CallLogForm leadId={leadId} onDone={() => setOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}

export function NoteForm({ leadId }: { leadId: string }) {
  return (
    <ActionForm action={addNote} resetOnSuccess className="grid gap-2">
      <input type="hidden" name="id" value={leadId} />
      <Field label="Add a note" name="body">
        <textarea name="body" rows={2} placeholder="Anything the team should know…" className="field-sm resize-y" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton variant="outline">
          <StickyNote className="size-4" /> Add note
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Stand-alone follow-up scheduler for the lead sidebar. */
export function FollowUpForm({ leadId, current }: { leadId: string; current: string }) {
  const [follow, setFollow] = useState<{ value: string; mode: Mode }>({ value: current, mode: current ? "custom" : "none" });
  return (
    <div className="grid gap-3">
      <ActionForm action={setFollowUp} className="grid gap-3">
        <input type="hidden" name="id" value={leadId} />
        <FollowUpField value={follow.value} mode={follow.mode} allowNone={false} onChange={(value, mode) => setFollow({ value, mode })} />
        {follow.mode !== "none" && (
          <SubmitButton variant="outline" className="w-full">
            <Save className="size-4" /> Save follow-up
          </SubmitButton>
        )}
      </ActionForm>
      {current && (
        <ActionButton action={setFollowUp} fields={{ id: leadId, follow_up_at: "" }} title="Clear follow-up">
          <X className="size-4" /> Clear follow-up
        </ActionButton>
      )}
    </div>
  );
}
