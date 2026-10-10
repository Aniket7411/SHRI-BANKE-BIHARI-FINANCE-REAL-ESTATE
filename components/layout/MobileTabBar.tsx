"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Building2, House, Landmark, Phone } from "lucide-react";
import { nav } from "@/lib/site";
import { isActive } from "./Header";

const icons = { home: House, building: Building2, landmark: Landmark, phone: Phone };

/** Native-app style bottom navigation, phones only. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App navigation"
      className="pb-safe fixed bg-surface shadow-[0_-6px_24px_-14px_rgba(15,27,45,0.2)] inset-x-0 bottom-0 z-50 border-t border-line md:hidden"
    >
      <ul className="grid grid-cols-4">
        {nav.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-accent" : "text-ink-soft"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-dot"
                    className="absolute top-0 h-[2px] w-8 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span whileTap={{ scale: 0.85 }}>
                  <Icon className="size-[21px]" strokeWidth={active ? 1.9 : 1.5} />
                </motion.span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
