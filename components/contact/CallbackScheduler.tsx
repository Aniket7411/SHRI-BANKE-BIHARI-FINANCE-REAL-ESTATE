"use client";

import { motion } from "motion/react";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { LeadForm } from "@/components/forms/LeadForm";

const slots = ["10:00 AM", "11:30 AM", "1:00 PM", "3:00 PM", "4:30 PM", "6:00 PM"];

type Day = { key: string; dow: string; date: number; month: string };

/** Pick a day + time, then submit — the slot is attached to the lead. */
export function CallbackScheduler() {
  const [days, setDays] = useState<Day[]>([]);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState(slots[1]);

  // Built after mount so the dates always match the visitor's clock.
  useEffect(() => {
    const out: Day[] = [];
    const d = new Date();
    while (out.length < 6) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue; // closed Sundays
      out.push({
        key: d.toDateString(),
        dow: d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString("en-IN", { month: "short" }),
      });
    }
    setDays(out);
  }, []);

  const chosen = days[day];

  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <CalendarDays className="size-4 text-accent" strokeWidth={1.5} /> Pick a day
      </p>
      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <span key={i} className="h-[76px] w-16 shrink-0 animate-pulse rounded-2xl bg-subtle" />)
          : days.map((d, i) => (
              <button
                key={d.key}
                onClick={() => setDay(i)}
                aria-pressed={day === i}
                className={`relative flex h-[76px] w-16 shrink-0 flex-col items-center justify-center rounded-2xl border transition-colors ${
                  day === i ? "border-accent text-accent-fg" : "border-line text-ink hover:border-ink/30"
                }`}
              >
                {day === i && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-accent" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative text-[11px] uppercase opacity-80">{d.dow}</span>
                <span className="relative font-display text-2xl leading-none">{d.date}</span>
                <span className="relative text-[11px] opacity-80">{d.month}</span>
              </button>
            ))}
      </div>

      <p className="mt-6 text-[13px] font-medium text-ink">Pick a time</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((s) => (
          <button
            key={s}
            onClick={() => setSlot(s)}
            aria-pressed={slot === s}
            className={`rounded-xl border py-2.5 text-sm transition-all ${
              slot === s ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink/30"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-8 border-t border-line pt-8">
        <LeadForm
          compact
          source="contact-callback"
          defaultInterest="Home Loan"
          extra={{ callbackSlot: chosen ? `${chosen.dow} ${chosen.date} ${chosen.month}, ${slot}` : slot }}
          submitLabel={chosen ? `Book ${chosen.dow} · ${slot}` : "Book callback"}
        />
      </div>
    </div>
  );
}
