"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * App-style modal: slides up as a bottom sheet on phones,
 * appears as a centred dialog on larger screens.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-deep/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-surface shadow-soft sm:max-w-3xl sm:rounded-[28px]"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
          >
            <div className="sticky top-0 z-10 flex justify-center pt-2.5 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-line" />
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="glass absolute top-4 right-4 z-20 grid size-10 place-items-center rounded-full border border-line text-ink transition hover:rotate-90"
            >
              <X className="size-4.5" strokeWidth={1.75} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
