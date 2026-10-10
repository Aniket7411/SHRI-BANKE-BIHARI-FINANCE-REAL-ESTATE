"use client";

import { motion, type HTMLMotionProps } from "motion/react";

export const ease = [0.22, 1, 0.36, 1] as const;

/** Fades + lifts content in once it scrolls into view. */
export function Reveal({
  delay = 0,
  y = 24,
  className,
  children,
  ...rest
}: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggers its direct <RevealItem> children. */
export function Stagger({ className, children, gap = 0.08 }: { className?: string; children: React.ReactNode; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ className, children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
