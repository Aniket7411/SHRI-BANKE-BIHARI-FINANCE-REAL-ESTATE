"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts up to `value` the first time it scrolls into view. */
export function Counter({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = v.toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + suffix;
      },
    });
    return () => controls.stop();
  }, [inView, value, decimals, suffix]);

  return (
    <span ref={ref}>
      {(0).toFixed(decimals)}
      {suffix}
    </span>
  );
}
