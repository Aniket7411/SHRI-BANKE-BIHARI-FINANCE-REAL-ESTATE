import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Building2, Clock, FileCheck2, HeartHandshake, Landmark, MapPin, Phone, Scale, ShieldCheck } from "lucide-react";
import { getBanks, getCities, getSiteSettings } from "@/lib/api";
import { cityList } from "@/lib/cities";
import { site, telLink, whatsappLink } from "@/lib/site";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonA, ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { PartnerBanks } from "@/components/loans/PartnerBanks";
import { CtaBand, Process, Stats } from "@/components/home/Sections";
import heroFamily from "@/public/hero-family.webp";

export async function generateMetadata(): Promise<Metadata> {
  const where = cityList((await getCities()).map((c) => c.name)) || "Kanpur";
  return {
    title: "About us",
    description: `${site.fullName} — a local property and loan advisory team in ${where}. Verified homes to buy, sell or rent, and home, car, education and business loans from 20+ banks.`,
    alternates: { canonical: "/about" },
  };
}

const realEstate = ["Flats, houses, villas and builder floors", "Residential and commercial plots", "Shops, offices, showrooms and godowns", "Selling and renting out your property"];
const loans = ["Home loans and balance transfer", "Car and vehicle loans", "Loan against property", "Education loans — India and abroad", "OD / CC limits for businesses"];

const values = [
  { icon: ShieldCheck, title: "Verified before you visit", text: "We check title, approvals and ownership papers before a listing goes live." },
  { icon: Scale, title: "Honest, upfront pricing", text: "Real prices, clear fees and no hidden charges — you see everything before you sign." },
  { icon: Landmark, title: "The lowest rate, not any rate", text: "We compare 20+ banks and NBFCs for your profile and negotiate on your behalf." },
  { icon: FileCheck2, title: "Paperwork at your doorstep", text: "We collect documents, fill forms and follow up with the bank — no queues for you." },
  { icon: HeartHandshake, title: "One advisor, start to finish", text: "The same person from your first site visit to the final disbursal, on WhatsApp." },
  { icon: Clock, title: "Fast, and we keep you posted", text: "Vehicle loans in 24–48 hours, home loans in days, and updates at every step." },
];

export default async function AboutPage() {
  const [s, cities, banks] = await Promise.all([getSiteSettings(), getCities(), getBanks()]);
  const where = cityList(cities.map((c) => c.name)) || "Kanpur";
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.fullName}, ${s.address}`)}`;

  return (
    <>
      <PageHero
        crumb="About us"
        eyebrow="Who we are"
        title={
          <>
            Your one-step <em className="text-accent">property &amp; loan partner.</em>
          </>
        }
        text={`A local team in ${where} helping families find the right home and the right loan — with honest advice, verified listings and the best rates from 20+ banks.`}
        image="/hero-family.webp"
      />

      {/* Story */}
      <section className="container-app grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[32px]">
            <Image src={heroFamily} alt="A family receiving the keys to their new home from our advisor" fill placeholder="blur" sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
          <div className="glass absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl border border-line px-4 py-3 shadow-soft sm:left-auto sm:right-6">
            <BadgeCheck className="size-6 text-accent" strokeWidth={1.5} />
            <p className="text-sm text-ink">
              <strong>One team</strong> for property &amp; loans
            </p>
          </div>
        </Reveal>
        <div>
          <SectionHeading
            eyebrow="Our story"
            title={
              <>
                Built on trust, <em className="text-accent">one family at a time.</em>
              </>
            }
          />
          <div className="mt-6 grid gap-4 text-[15px] leading-relaxed text-ink-soft">
            <p>
              <strong className="text-ink">{site.fullName}</strong> started in Kanpur with a simple idea: buying a home shouldn&apos;t mean running between a broker, a bank and a
              lawyer. We bring all three together, so your deal moves faster and costs less.
            </p>
            <p>
              Today we are a leading loan partner (DSA) for government and private banks in {where}. We arrange housing, car, education and property loans and OD/CC limits — and
              we help families buy, sell and rent verified homes, plots and commercial spaces.
            </p>
            <p>
              We&apos;re local people serving local families. You get a real advisor you can call or WhatsApp — not a call centre — from your first site visit to the day you get
              your keys.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/properties" arrow>
              Browse properties
            </ButtonLink>
            <ButtonLink href="/loans" variant="outline">
              Compare loan rates
            </ButtonLink>
          </div>
        </div>
      </section>

      <Stats />

      {/* What we do */}
      <section className="container-app py-12 sm:py-14">
        <SectionHeading eyebrow="What we do" title="Two services, one advisor." className="mb-10" />
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { icon: Building2, title: "Real estate", text: "Buy, sell or rent with verified listings and honest valuations.", items: realEstate, href: "/properties", cta: "See properties" },
            { icon: Landmark, title: "Loans & finance", text: "We compare 20+ lenders and handle the paperwork for the lowest rate.", items: loans, href: "/loans", cta: "Explore loans" },
          ].map(({ icon: Icon, title, text, items, href, cta }) => (
            <Reveal key={title} className="flex flex-col rounded-[28px] border border-line bg-surface p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="size-6" strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 text-2xl text-ink">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{text}</p>
              <ul className="mt-5 grid flex-1 gap-2.5">
                {items.map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink">
                    <BadgeCheck className="mt-0.5 size-4.5 shrink-0 text-accent" strokeWidth={1.75} /> {i}
                  </li>
                ))}
              </ul>
              <Link href={href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                {cta} <ArrowUpRight className="size-4" />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-subtle py-14 sm:py-16">
        <div className="container-app">
          <SectionHeading
            align="center"
            eyebrow="How we work"
            title={
              <>
                Promises we <em className="text-accent">actually keep.</em>
              </>
            }
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <Reveal key={title} className="rounded-[24px] border border-line bg-surface p-6">
                <span className="grid size-11 place-items-center rounded-2xl border border-line text-accent">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <h3 className="mt-4 font-sans text-base font-semibold tracking-normal text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Where we work */}
      {cities.length > 0 && (
        <section className="container-app py-14 sm:py-16">
          <SectionHeading eyebrow="Where we work" title={`Serving ${where}.`} text="Our advisors know these neighbourhoods street by street." className="mb-10" />
          <div className="grid gap-5 md:grid-cols-2">
            {cities.map((c) => (
              <Reveal key={c.name} className="rounded-[24px] border border-line bg-surface p-6">
                <p className="flex items-center gap-2 text-xl text-ink">
                  <MapPin className="size-5 text-accent" strokeWidth={1.5} /> {c.name}
                </p>
                {c.localities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.localities.map((l) => (
                      <Link
                        key={l}
                        href={`/properties?city=${encodeURIComponent(c.name)}&locality=${encodeURIComponent(l)}`}
                        className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink transition hover:border-accent hover:text-accent"
                      >
                        {l}
                      </Link>
                    ))}
                  </div>
                )}
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <PartnerBanks banks={banks} className="pt-0 sm:pt-0" />

      <Process />

      {/* Visit us */}
      <section className="container-app py-14 sm:py-16">
        <Reveal className="grid gap-8 rounded-[32px] border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="eyebrow">Visit our office</span>
            <h2 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] leading-tight text-ink">Come in for a chai and a chat.</h2>
            <p className="mt-3 max-w-md text-ink-soft">Bring your questions — about a property, a loan or both. No appointment needed during office hours.</p>
          </div>
          <div className="grid gap-3 text-sm">
            <a href={mapUrl} target="_blank" rel="noopener" className="flex items-start gap-3 rounded-2xl bg-subtle p-4 text-ink transition hover:bg-accent-soft">
              <MapPin className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <span>
                {s.address}
                <span className="mt-1 block text-xs font-semibold text-accent">Open in Google Maps →</span>
              </span>
            </a>
            <p className="flex items-center gap-3 rounded-2xl bg-subtle p-4 text-ink">
              <Clock className="size-5 shrink-0 text-accent" strokeWidth={1.5} /> {s.hours}
            </p>
            <div className="flex flex-wrap gap-2">
              <ButtonA href={telLink(s)} variant="outline" className="flex-1" icon={<Phone className="size-4" strokeWidth={1.5} />}>
                {s.phone}
              </ButtonA>
              <ButtonA href={whatsappLink(s)} target="_blank" rel="noreferrer" className="flex-1 bg-wa text-white hover:bg-wa/90" icon={<WhatsAppIcon className="size-4" />}>
                WhatsApp
              </ButtonA>
            </div>
          </div>
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}
