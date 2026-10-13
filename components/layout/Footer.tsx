import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { nav, site, telLink, whatsappLink, type SiteSettings } from "@/lib/site";
import { FacebookIcon, InstagramIcon, LogoMark, WhatsAppIcon, YouTubeIcon } from "@/components/ui/BrandIcons";
import { NewsletterForm } from "./NewsletterForm";

const services = [
  { label: "Home Loans", href: "/loans#products" },
  { label: "Vehicle Loans", href: "/loans#products" },
  { label: "Loan Against Property", href: "/loans#products" },
  { label: "EMI Calculator", href: "/loans#emi" },
  { label: "Buy Property", href: "/properties" },
  { label: "Sell Property", href: "/contact" },
];

export function Footer({ settings: s }: { settings: SiteSettings }) {
  return (
    <footer className="relative overflow-hidden bg-deep text-deep-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />
      <div className="container-app relative pt-16 pb-28 md:pb-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <LogoMark className="size-11 [&_rect]:fill-white/10" />
              <div>
                <p className="font-display text-xl">{site.name}</p>
                <p className="text-[10px] tracking-[0.22em] text-deep-fg/60 uppercase">Finance &amp; Real Estate</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-deep-fg/70">
              {site.tagline}. Buy, sell or rent with confidence, and finance it at the best available rates — all under one
              roof.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={s.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-accent hover:text-accent"
              >
                <InstagramIcon className="size-[18px]" />
              </a>
              {s.facebook && (
                <a
                  href={s.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-accent hover:text-accent"
                >
                  <FacebookIcon className="size-[18px]" />
                </a>
              )}
              {s.youtube && (
                <a
                  href={s.youtube}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-accent hover:text-accent"
                >
                  <YouTubeIcon className="size-[18px]" />
                </a>
              )}
              <a
                href={whatsappLink(s)}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="grid size-10 place-items-center rounded-full border border-white/15 transition hover:border-wa hover:text-wa"
              >
                <WhatsAppIcon className="size-[18px]" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <FooterCol title="Explore">
              {nav.map((n) => (
                <FooterLink key={n.href} href={n.href}>
                  {n.label}
                </FooterLink>
              ))}
              <FooterLink href="/careers">Careers</FooterLink>
            </FooterCol>
            <FooterCol title="Services">
              {services.map((s) => (
                <FooterLink key={s.label} href={s.href}>
                  {s.label}
                </FooterLink>
              ))}
            </FooterCol>
            <div className="col-span-2 sm:col-span-1">
              <FooterCol title="Reach us">
                <li className="flex gap-2.5 text-sm text-deep-fg/70">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} />
                  {s.address}
                </li>
                <li>
                  <a href={telLink(s)} className="flex gap-2.5 text-sm text-deep-fg/70 hover:text-deep-fg">
                    <Phone className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} />
                    {s.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${s.email}`} className="flex gap-2.5 text-sm break-all text-deep-fg/70 hover:text-deep-fg">
                    <Mail className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} />
                    {s.email}
                  </a>
                </li>
                <li className="flex gap-2.5 text-sm text-deep-fg/70">
                  <Clock className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} />
                  {s.hours}
                </li>
              </FooterCol>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="font-display text-2xl">Rate drops &amp; new listings, first.</p>
            <p className="mt-1 text-sm text-deep-fg/60">One short update a month. No spam, ever.</p>
          </div>
          <NewsletterForm />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-deep-fg/50 md:flex-row md:justify-between">
          <p>© {2026} {site.fullName}. All rights reserved.</p>
          <p className="max-w-xl md:text-right">
            Interest rates are indicative and subject to lender policies, credit profile and RBI guidelines.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">{title}</p>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group inline-flex items-center text-sm text-deep-fg/70 transition hover:text-deep-fg">
        <span className="h-px w-0 bg-accent transition-all duration-300 group-hover:mr-2 group-hover:w-3" />
        {children}
      </Link>
    </li>
  );
}
