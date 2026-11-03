"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Building2, ChevronRight, House, Info, Landmark, Menu, Phone, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { nav, site, telLink, whatsappLink } from "@/lib/site";
import { LogoMark, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { useSite } from "./SiteProvider";
import { useCity } from "./CityProvider";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { isActive } from "./Header";

const icons = { home: House, building: Building2, landmark: Landmark, phone: Phone, info: Info, briefcase: Briefcase };

/** Hamburger + slide-in menu for phones and small tablets (the header stays fixed, so it's always reachable). */
export function MobileMenu() {
  const s = useSite();
  const pathname = usePathname();
  const { cities, city, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const links = [...nav, { href: "/careers", label: "Careers", icon: "briefcase" as const }];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent md:hidden"
      >
        <Menu className="size-[18px]" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] md:hidden">
            <motion.div className="absolute inset-0 bg-deep/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 right-0 flex w-[min(86vw,360px)] flex-col overflow-y-auto overscroll-contain bg-surface shadow-soft"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
                  <LogoMark className="size-12" />
                  <span className="font-display text-[15px] text-ink">{site.name}</span>
                </Link>
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-full hover:bg-subtle">
                  <X className="size-5 text-ink" />
                </button>
              </div>

              <nav aria-label="Menu" className="px-2 py-3">
                {links.map((l) => {
                  const Icon = l.icon === "briefcase" ? Briefcase : icons[l.icon];
                  const active = isActive(pathname, l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition ${active ? "bg-accent-soft text-accent-strong" : "text-ink hover:bg-subtle"}`}
                    >
                      <Icon className="size-5" strokeWidth={active ? 1.9 : 1.5} />
                      <span className="flex-1">{l.label}</span>
                      <ChevronRight className="size-4 opacity-40" />
                    </Link>
                  );
                })}
              </nav>

              {cities.length > 1 && (
                <div className="border-t border-line px-4 py-4">
                  <p className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Show properties in</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {[{ name: "", label: "All cities" }, ...cities.map((c) => ({ name: c.name, label: c.name }))].map((o) => (
                      <button
                        key={o.label}
                        onClick={() => setCity(o.name)}
                        aria-pressed={o.name === city}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition ${o.name === city ? "border-accent bg-accent text-accent-fg" : "border-line text-ink hover:border-accent"}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 border-t border-line px-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <a href={telLink(s)} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line text-sm font-medium text-ink">
                    <Phone className="size-4" strokeWidth={1.5} /> Call
                  </a>
                  <a href={whatsappLink(s)} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-full bg-wa text-sm font-medium text-white">
                    <WhatsAppIcon className="size-4" /> WhatsApp
                  </a>
                </div>
                <span onClick={() => setOpen(false)}>
                  <ButtonLink href="/contact" variant="solid" arrow className="h-11 w-full">
                    Free consultation
                  </ButtonLink>
                </span>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-ink-soft">
                  Theme <ThemeSwitcher align="left" up />
                </span>
                <Link href="/admin/login" onClick={() => setOpen(false)} className="flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink">
                  <UserRound className="size-3.5" /> Admin login
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
