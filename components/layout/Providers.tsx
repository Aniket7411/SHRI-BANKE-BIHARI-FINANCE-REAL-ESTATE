"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { captureUtm } from "@/lib/utm";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(captureUtm, []);
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
