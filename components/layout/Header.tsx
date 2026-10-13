"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Phone } from "lucide-react";
import { useState } from "react";
import { nav, site, telLink } from "@/lib/site";
import { LogoMark } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useSite } from "@/components/layout/SiteProvider";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.fullName} — home`}>
      <LogoMark className="size-9 shrink-0" />
      <span className="leading-none">
        <span className="font-display block text-[17px] whitespace-nowrap text-ink">{site.name}</span>
        <span className="mt-1 block text-[9.5px] font-semibold tracking-[0.22em] whitespace-nowrap text-ink-soft uppercase">
          Finance &amp; Real Estate
        </span>
      </span>
    </Link>
  );
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const s = useSite();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  // Solid white bar that stays fixed on every device; gains a soft shadow once scrolled.
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b bg-surface transition-shadow duration-300 ${
          scrolled ? "border-line shadow-[0_6px_24px_-12px_rgba(15,27,45,0.18)]" : "border-line/60"
        }`}
      >
        <div className="container-app flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-1 rounded-full border border-line bg-subtle p-1 md:flex">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                    active ? "text-bg" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <a
              href={telLink(s)}
              aria-label="Call us"
              className="grid size-10 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent lg:hidden"
            >
              <Phone className="size-[17px]" strokeWidth={1.5} />
            </a>
            <div className="hidden lg:block">
              <ButtonLink href="/contact" variant="solid" size="sm" arrow className="h-10">
                Free consultation
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
