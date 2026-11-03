"use client";

import { motion } from "motion/react";
import { ArrowRightLeft, CalendarClock, Mail, PhoneCall, Repeat, Sparkles, StickyNote, UserRoundCheck, type LucideIcon } from "lucide-react";
import { Badge, type Tone } from "@/components/admin/ui";

export interface TimelineEntry {
  id: string | number;
  kind: string;
  title: string;
  body: string | null;
  actor: string;
  at: string; // formatted IST timestamp
  ago: string;
  badge?: { label: string; tone: Tone };
}

const KINDS: Record<string, { icon: LucideIcon; ring: string }> = {
  created: { icon: Sparkles, ring: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  resubmitted: { icon: Repeat, ring: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  call: { icon: PhoneCall, ring: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  note: { icon: StickyNote, ring: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  status: { icon: ArrowRightLeft, ring: "bg-accent-soft text-accent-strong" },
  assigned: { icon: UserRoundCheck, ring: "bg-accent-soft text-accent-strong" },
  email: { icon: Mail, ring: "bg-subtle text-ink-soft" },
  follow_up: { icon: CalendarClock, ring: "bg-subtle text-ink-soft" },
};

/** Vertical activity timeline, newest first, animated in. */
export function Timeline({ items }: { items: TimelineEntry[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-soft">No activity yet.</p>;
  return (
    <ol className="relative">
      <span aria-hidden className="absolute top-2 bottom-2 left-[17px] w-px bg-line" />
      {items.map((it, i) => {
        const k = KINDS[it.kind] ?? KINDS.note;
        const Icon = k.icon;
        return (
          <motion.li
            key={it.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.04, ease: "easeOut" }}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-surface ${k.ring}`}>
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink">
                {it.title}
                {it.badge && <Badge tone={it.badge.tone}>{it.badge.label}</Badge>}
              </p>
              {it.body && <p className="mt-1 rounded-xl bg-subtle px-3 py-2 text-sm whitespace-pre-line text-ink">{it.body}</p>}
              <p className="mt-1 text-[11px] text-ink-soft">
                {it.actor} · <time title={it.ago}>{it.at}</time>
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
