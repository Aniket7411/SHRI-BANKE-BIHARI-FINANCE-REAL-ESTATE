"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { LeadForm } from "@/components/forms/LeadForm";
import { CallbackScheduler } from "./CallbackScheduler";

const tabs = [
  { id: "enquiry", label: "Send an enquiry" },
  { id: "callback", label: "Book a callback" },
] as const;

export function ContactTabs() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("enquiry");
  return (
    <div className="rounded-[28px] border border-line bg-surface p-6 shadow-soft sm:p-10">
      <div role="tablist" className="grid grid-cols-2 rounded-full border border-line p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative rounded-full py-2.5 text-sm font-medium transition-colors ${tab === t.id ? "text-bg" : "text-ink-soft"}`}
          >
            {tab === t.id && <motion.span layoutId="contact-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tab === "callback" ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: tab === "callback" ? -20 : 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          {tab === "enquiry" ? <LeadForm source="contact-enquiry" submitLabel="Send enquiry" /> : <CallbackScheduler />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
