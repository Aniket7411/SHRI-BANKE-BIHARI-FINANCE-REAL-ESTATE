"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Briefcase,
  Building2,
  ExternalLink,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  MessageSquareQuote,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/ui/BrandIcons";
import { signOut } from "@/lib/admin/session-actions";
import type { Staff } from "@/lib/admin/auth";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; admin?: boolean };

const nav: { title?: string; items: Item[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Website",
    items: [
      { href: "/admin/properties", label: "Properties", icon: Building2, admin: true },
      { href: "/admin/loans", label: "Loans & rates", icon: Landmark, admin: true },
      { href: "/admin/content", label: "Reviews & FAQs", icon: MessageSquareQuote, admin: true },
      { href: "/admin/careers", label: "Careers", icon: Briefcase, admin: true },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/team", label: "Team", icon: Users, admin: true },
      { href: "/admin/settings", label: "Settings", icon: Settings, admin: true },
      { href: "/admin/account", label: "My account", icon: UserRound },
    ],
  },
];

const isActive = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

export function AdminShell({ staff, children }: { staff: Staff; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const groups = nav.map((g) => ({ ...g, items: g.items.filter((i) => !i.admin || staff.role === "admin") })).filter((g) => g.items.length);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5" onClick={() => setOpen(false)}>
        <LogoMark className="size-9" />
        <span>
          <span className="block font-display text-[15px] leading-tight text-ink">Shri Banke Bihari</span>
          <span className="block text-[10px] tracking-[0.18em] text-ink-soft uppercase">Admin &amp; CRM</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(path, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-ink font-medium text-bg" : "text-ink-soft hover:bg-subtle hover:text-ink"}`}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <a href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-subtle hover:text-ink">
          <ExternalLink className="size-4" strokeWidth={1.75} /> View website
        </a>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-fg uppercase">{staff.fullName.slice(0, 1)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{staff.fullName}</span>
            <span className="block text-[11px] text-ink-soft capitalize">{staff.role}</span>
          </span>
          <form action={signOut}>
            <button aria-label="Sign out" title="Sign out" className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-surface hover:text-red-600">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full bg-subtle">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-surface lg:block">{sidebar}</aside>

      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-surface transition-transform lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-5 right-4 grid size-8 place-items-center rounded-full hover:bg-subtle">
          <X className="size-4" />
        </button>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-full border border-line">
            <Menu className="size-4" />
          </button>
          <span className="font-display text-ink">Admin</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
