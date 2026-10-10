import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { getFaqs } from "@/lib/api";
import { IMG } from "@/lib/img";
import { site, telLink, whatsappLink } from "@/lib/site";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal, RevealItem, Stagger } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ContactTabs } from "@/components/contact/ContactTabs";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Talk to ${site.fullName} — call, WhatsApp or visit our office in Kanpur. Free property and loan consultation.`,
};

const channels = [
  { icon: <WhatsAppIcon className="size-5" />, label: "WhatsApp", value: "Chat instantly", href: whatsappLink(), tint: "text-wa", external: true },
  { icon: <Phone className="size-5" strokeWidth={1.5} />, label: "Call us", value: site.phone, href: telLink, tint: "text-accent" },
  { icon: <Mail className="size-5" strokeWidth={1.5} />, label: "Email", value: site.email, href: `mailto:${site.email}`, tint: "text-accent" },
  { icon: <InstagramIcon className="size-5" />, label: "Instagram", value: site.instagramHandle, href: site.instagram, tint: "text-accent", external: true },
];

export default async function ContactPage() {
  const faqs = await getFaqs();

  return (
    <>
      <PageHero
        crumb="Contact"
        eyebrow="We're here to help"
        title={
          <>
            Let&apos;s find your <em className="text-accent">next move.</em>
          </>
        }
        text="Free consultation for buying, selling, renting or financing property in Kanpur. We usually reply within minutes."
        image={IMG.meeting}
      />

      <section className="container-app py-12 sm:py-16">
        <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {channels.map((c) => (
            <RevealItem key={c.label}>
              <a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="group flex h-full flex-col rounded-[22px] border border-line bg-surface p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className={`grid size-11 place-items-center rounded-2xl bg-subtle ${c.tint}`}>{c.icon}</span>
                  <ArrowUpRight className="size-4 text-ink-soft transition group-hover:rotate-45 group-hover:text-accent" strokeWidth={1.5} />
                </div>
                <p className="mt-5 text-xs tracking-wide text-ink-soft uppercase">{c.label}</p>
                <p className="mt-1 text-sm font-semibold break-all text-ink">{c.value}</p>
              </a>
            </RevealItem>
          ))}
        </Stagger>
      </section>

      <section className="container-app grid gap-10 pb-16 sm:pb-24 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Visit our office"
            title={
              <>
                Drop by for <em className="text-accent">chai &amp; a chat.</em>
              </>
            }
          />
          <Reveal className="space-y-4 text-sm">
            <p className="flex gap-3 text-ink">
              <MapPin className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              {site.address}
            </p>
            <p className="flex gap-3 text-ink">
              <Clock className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              {site.hours} · Sunday by appointment
            </p>
          </Reveal>
          <Reveal className="overflow-hidden rounded-[28px] border border-line">
            <iframe
              title="Office location on Google Maps"
              src={`https://www.google.com/maps?q=${encodeURIComponent(site.address)}&output=embed`}
              className="h-72 w-full grayscale-[0.4] sm:h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Reveal>
        </div>

        <Reveal delay={0.1} className="lg:sticky lg:top-24 lg:self-start">
          <ContactTabs />
        </Reveal>
      </section>

      <section className="bg-subtle py-20 sm:py-24">
        <div className="container-app grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading eyebrow="FAQs" title="Before you reach out." text="Quick answers to what most clients ask us first." />
          <Reveal>
            <Accordion items={faqs} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
