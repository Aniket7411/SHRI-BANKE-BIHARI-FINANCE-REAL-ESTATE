"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; title: string; text?: string };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((all) => [...all, { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line p-4 shadow-soft"
            >
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.text && <p className="mt-0.5 text-[13px] text-ink-soft">{t.text}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
