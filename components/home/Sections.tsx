import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Clock, FileCheck2, Handshake, Landmark, Phone, ShieldCheck, Building2 } from "lucide-react";
import { IMG } from "@/lib/img";
import { telLink, whatsappLink } from "@/lib/site";
import { marquee, services, steps } from "@/lib/data/content";
import { getSiteSettings } from "@/lib/api";
import { Counter } from "@/components/ui/Counter";
import { Reveal, RevealItem, Stagger } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonA, ButtonLink } from "@/components/ui/Button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";

/* ───────── Marquee ───────── */
export function Marquee() {
  const items = [...marquee, ...marquee];
  return (
    <div className="overflow-hidden border-y border-line bg-subtle py-5" aria-hidden>
      <div className="flex w-max animate-marquee gap-10 hover:[animation-play-state:paused]">
        {items.map((m, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-lg text-ink-soft sm:text-xl">
            {m}
            <span className="size-1.5 rounded-full bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Stats ───────── */
export async function Stats() {
  const { stats } = await getSiteSettings();
  return (
    <section className="container-app py-16 sm:py-20">
      <Stagger className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-line bg-line lg:grid-cols-4">
        {stats.map((s) => (
          <RevealItem key={s.label} className="bg-surface p-6 sm:p-8">
            <p className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-none text-ink">
              <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} />
            </p>
            <p className="mt-3 text-sm text-ink-soft">{s.label}</p>
          </RevealItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ───────── Services ───────── */
export function Services() {
  return (
    <section className="container-app py-16 sm:py-24">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="What we do"
          title={
            <>
              Property and finance, <em className="text-accent">under one roof.</em>
            </>
          }
          text="Most people juggle a broker, a bank and a lawyer. We bring all three together so your deal moves faster and costs less."
        />
        <Reveal>
          <ButtonLink href="/contact" variant="outline" arrow>
            Talk to an advisor
          </ButtonLink>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <ServiceCard
          href="/properties"
          img={IMG.keys}
          icon={<Building2 className="size-5" strokeWidth={1.5} />}
          title="Real Estate"
          text="Buy, sell or rent — verified listings and honest valuations across Kanpur."
          items={services.realEstate}
        />
        <ServiceCard
          href="/loans"
          img={IMG.financeDocs}
          icon={<Landmark className="size-5" strokeWidth={1.5} />}
          title="Loans & Finance"
          text="We compare 20+ lenders and handle the paperwork to get you the lowest rate."
          items={services.finance}
          delay={0.1}
        />
      </div>
    </section>
  );
}

function ServiceCard({
  href,
  img,
  icon,
  title,
  text,
  items,
  delay = 0,
}: {
  href: string;
  img: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  items: string[];
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <Link
        href={href}
        className="group grid h-full overflow-hidden rounded-[28px] border border-line bg-surface transition-shadow duration-500 hover:shadow-soft sm:grid-cols-[1fr_1.1fr]"
      >
        <div className="relative min-h-56 overflow-hidden">
          <Image src={img} alt="" fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-app group-hover:scale-105" />
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">{icon}</span>
            <span className="grid size-10 place-items-center rounded-full border border-line text-ink transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg">
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </span>
          </div>
          <h3 className="mt-6 text-3xl text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
          <ul className="mt-6 space-y-2.5">
            {items.map((i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-ink">
                <Check className="size-4 text-accent" strokeWidth={2} /> {i}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </Reveal>
  );
}

/* ───────── Process ───────── */
export function Process() {
  return (
    <section className="bg-subtle py-20 sm:py-28">
      <div className="container-app">
        <SectionHeading align="center" eyebrow="How it works" title="Four steps to your keys." />
        <Stagger className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" gap={0.12}>
          <div aria-hidden className="absolute top-6 right-[12%] left-[12%] hidden h-px bg-line lg:block" />
          {steps.map((s, i) => (
            <RevealItem key={s.title} className="relative text-center">
              <span className="relative mx-auto grid size-12 place-items-center rounded-full border border-accent bg-bg font-display text-lg text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-6 text-xl text-ink">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────── Why us ───────── */
const reasons = [
  { icon: ShieldCheck, title: "Verified & legal-checked", text: "Every listing is title-verified before it reaches you." },
  { icon: Landmark, title: "20+ lending partners", text: "We negotiate the lowest rate, not just any rate." },
  { icon: FileCheck2, title: "Doorstep paperwork", text: "Documents collected and filed for you — no queues." },
  { icon: Clock, title: "Fast approvals", text: "Vehicle loans in 24–48 hrs, home loans in days." },
];

export function WhyUs() {
  return (
    <section className="container-app grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-2">
      <Reveal className="relative">
        <div className="grid grid-cols-5 grid-rows-6 gap-3 sm:gap-4">
          <div className="relative col-span-3 row-span-6 aspect-[3/4] overflow-hidden rounded-[26px]">
            <Image src={IMG.interior3} alt="Bright living room" fill sizes="(min-width:1024px) 30vw, 60vw" className="object-cover" />
          </div>
          <div className="relative col-span-2 row-span-3 overflow-hidden rounded-[22px]">
            <Image src={IMG.handshake} alt="Advisor greeting a client" fill sizes="20vw" className="object-cover" />
          </div>
          <div className="relative col-span-2 row-span-3 overflow-hidden rounded-[22px]">
            <Image src={IMG.house5} alt="Family home exterior" fill sizes="20vw" className="object-cover" />
          </div>
        </div>
        <div className="glass absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-line px-5 py-3 shadow-soft">
          <Handshake className="size-6 text-accent" strokeWidth={1.5} />
          <p className="text-sm whitespace-nowrap text-ink">
            <strong>Zero</strong> hidden charges
          </p>
        </div>
      </Reveal>

      <div>
        <SectionHeading
          eyebrow="Why Shri Banke Bihari"
          title={
            <>
              A local team you can <em className="text-accent">actually call.</em>
            </>
          }
          text="We're Kanpur people serving Kanpur families. You get one advisor from first visit to final disbursal — reachable on WhatsApp, not stuck behind a call centre."
        />
        <Stagger className="mt-10 grid gap-6 sm:grid-cols-2">
          {reasons.map(({ icon: Icon, title, text }) => (
            <RevealItem key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line text-accent">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-sans text-[15px] font-semibold tracking-normal text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
              </div>
            </RevealItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────── Instagram ───────── */
export async function InstagramStrip() {
  const s = await getSiteSettings();
  const shots = [IMG.house2, IMG.interior4, IMG.keys, IMG.villa, IMG.livingRoom, IMG.car2];
  return (
    <section className="container-app py-20 sm:py-24">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading eyebrow="Follow along" title={<>Fresh listings daily on Instagram.</>} text={`Join 1,500+ followers at ${s.instagramHandle} for new properties, rate updates and tips.`} />
        <Reveal>
          <ButtonA href={s.instagram} target="_blank" rel="noreferrer" variant="outline" arrow icon={<InstagramIcon className="size-4" />}>
            Follow us
          </ButtonA>
        </Reveal>
      </div>
      <Stagger className="mt-10 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6" gap={0.06}>
        {shots.map((src, i) => (
          <RevealItem key={src}>
            <a
              href={s.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label={`Instagram post ${i + 1}`}
              className="group relative block aspect-square overflow-hidden rounded-2xl"
            >
              <Image src={src} alt="" fill sizes="(min-width:1024px) 16vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <span className="absolute inset-0 grid place-items-center bg-deep/50 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <InstagramIcon className="size-6" />
              </span>
            </a>
          </RevealItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ───────── Final CTA ───────── */
export async function CtaBand() {
  const s = await getSiteSettings();
  return (
    <section className="container-app pb-20 sm:pb-28">
      <Reveal className="relative overflow-hidden rounded-[32px] bg-deep px-6 py-14 text-deep-fg sm:px-12 sm:py-20">
        <Image src={IMG.house6} alt="" fill sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-deep via-deep/85 to-deep/40" />
        <div className="relative max-w-2xl">
          <span className="eyebrow">Free consultation</span>
          <h2 className="mt-4 text-[clamp(2rem,5vw,3.6rem)] leading-[1.05]">
            Ready to move? <em className="text-accent">Let&apos;s talk today.</em>
          </h2>
          <p className="mt-4 max-w-lg text-deep-fg/70">
            Get a free property shortlist or loan eligibility report within 24 hours. No obligations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonA href={whatsappLink(s)} target="_blank" rel="noreferrer" size="lg" className="bg-wa text-white hover:bg-wa/90" icon={<WhatsAppIcon className="size-5" />}>
              WhatsApp us
            </ButtonA>
            <ButtonA href={telLink(s)} variant="light" size="lg" icon={<Phone className="size-4" strokeWidth={1.5} />}>
              {s.phone}
            </ButtonA>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
