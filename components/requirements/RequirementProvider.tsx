"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { RequirementForm, type RequirementPrefill } from "./RequirementForm";

const Ctx = createContext<(prefill?: RequirementPrefill, source?: string) => void>(() => {});

/** Opens the "Tell us what you need" sheet from anywhere on the public site. */
export const useRequirement = () => useContext(Ctx);

export function RequirementProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ prefill?: RequirementPrefill; source: string; key: number }>({ source: "Requirement form", key: 0 });

  const show = useCallback((prefill?: RequirementPrefill, source = "Requirement form") => {
    // A fresh key resets the form, so each open starts from the latest filters.
    setState((s) => ({ prefill, source, key: s.key + 1 }));
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Ctx value={show}>
      {children}
      <Sheet open={open} onClose={close} label="Tell us what you're looking for">
        <RequirementForm key={state.key} prefill={state.prefill} source={state.source} onClose={close} />
      </Sheet>
    </Ctx>
  );
}
