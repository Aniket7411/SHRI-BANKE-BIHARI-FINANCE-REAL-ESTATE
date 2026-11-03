"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellOff, BellRing, CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setAlerts } from "../actions";

export function AlertsToggle({ token, initial, hasEmail }: { token: string; initial: boolean; hasEmail: boolean }) {
  const [on, setOn] = useState(initial);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const update = (next: boolean) =>
    start(async () => {
      setError("");
      try {
        const res = await setAlerts(token, next);
        if (!res.ok) return setError(res.message);
        setOn(res.alerts);
        setChanged(true);
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });

  return (
    <div className="mt-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={String(on)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex items-start gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-full ${on ? "bg-accent-soft text-accent" : "bg-subtle text-ink-soft"}`}>
            {on ? <BellRing className="size-5" strokeWidth={1.75} /> : <BellOff className="size-5" strokeWidth={1.75} />}
          </span>
          <div>
            <p className="font-semibold text-ink">{changed ? (on ? "Alerts are back on" : "Alerts stopped") : on ? "Alerts are on" : "Alerts are off"}</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {on
                ? hasEmail
                  ? "We'll email you when a property matching this requirement is listed."
                  : "Our team will contact you when a matching property is listed."
                : "You won't get new-listing emails for this requirement. Our advisor may still call about your enquiry."}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-200">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => update(!on)}
          disabled={pending}
          className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-70 ${
            on ? "border border-line text-ink hover:border-red-400 hover:text-red-600" : "bg-ink text-bg hover:bg-accent hover:text-accent-fg"
          }`}
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : on ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
          {pending ? "Updating…" : on ? "Stop alerts" : "Turn alerts back on"}
        </button>
        <Link href="/properties" className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-line px-6 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent">
          Browse properties
        </Link>
      </div>
    </div>
  );
}
