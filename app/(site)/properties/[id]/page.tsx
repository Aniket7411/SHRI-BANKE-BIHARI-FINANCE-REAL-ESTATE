import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarCheck, Check, ChevronRight, FileCheck2, Landmark, MapPin, Phone, ShieldCheck } from "lucide-react";
import { getProperties, getPropertyById, getSimilarProperties, getSiteSettings } from "@/lib/api";
import { calcEmi, formatINR, formatPrice } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/site";
import { summaryLine } from "@/lib/property-meta";
import { Gallery } from "@/components/property/Gallery";
import { KeyFacts, PropertySpecs } from "@/components/property/PropertySpecs";
import { VideoReels } from "@/components/property/VideoReels";
import { ShareSave } from "@/components/property/ShareSave";
import { PropertyCard } from "@/components/property/PropertyCard";
import { LeadForm } from "@/components/forms/LeadForm";
import { ButtonA } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbLd, listingLd } from "@/lib/seo";

export async function generateStaticParams() {
  const all = await getProperties();
  // Cache Components needs at least one param; unknown ids still render on demand.
  return all.length ? all.map((p) => ({ id: p.id })) : [{ id: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) return { title: "Property not found" };
  return {
    title: `${p.title} ${p.purpose === "Rent" ? "for Rent" : "for Sale"} in ${p.locality}, ${p.city}`,
    description: `${p.title} in ${p.locality}, ${p.city} — ${formatPrice(p.price)}${p.purpose === "Rent" ? "/month" : ""}. ${p.description}`,
    alternates: { canonical: `/properties/${p.id}` },
    openGraph: { type: "article", url: `/properties/${p.id}`, images: p.images.slice(0, 1) },
  };
}

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) notFound();
  const [similar, s] = await Promise.all([getSimilarProperties(id), getSiteSettings()]);
  const loan = p.price * 0.8;
  const emi = p.purpose === "Buy" ? calcEmi(loan, s.rates.home, 20).emi : 0;

  return (
    <div className="pt-16 lg:pt-[72px]">
      <JsonLd
        data={[
          listingLd(p),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Properties", path: "/properties" },
            { name: p.city, path: `/properties?city=${encodeURIComponent(p.city)}` },
            { name: p.title, path: `/properties/${p.id}` },
          ]),
        ]}
      />
      <div className="container-app">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 py-3 text-xs text-ink-soft">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="size-3" />
          <Link href="/properties" className="hover:text-ink">
            Properties
          </Link>
          <ChevronRight className="size-3" />
          <Link href={`/properties?city=${encodeURIComponent(p.city)}`} className="hover:text-ink">
            {p.city}
          </Link>
          <ChevronRight className="size-3" />
          <span className="truncate text-ink">{p.title}</span>
        </nav>

        {/* Shop-style top: photos left, everything needed to decide on the right — all on the first screen. */}
        <div className="grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_460px]">
          <Gallery images={p.images} title={p.title} />

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-bg">{p.purpose === "Buy" ? "For Sale" : "For Rent"}</span>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-ink">{p.category}</span>
                {p.tags.map((t) => (
                  <span key={t} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-strong">
                    {t}
                  </span>
                ))}
              </div>
              <ShareSave id={p.id} title={p.title} compact />
            </div>

            <div>
              <h1 className="text-[clamp(1.6rem,2.4vw,2.1rem)] leading-tight text-ink">
                {p.title}
                {p.verified && <BadgeCheck className="ml-1.5 inline size-5 -translate-y-0.5 text-accent" strokeWidth={1.75} aria-label="Verified" />}
              </h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-ink-soft">
                <MapPin className="size-4 shrink-0" strokeWidth={1.5} /> {p.locality}, {p.city}
                <span className="text-line">|</span>
                <span className="font-medium text-ink">{summaryLine(p)}</span>
              </p>
            </div>

            <div className="rounded-2xl bg-subtle p-4">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <p className="font-display text-[2rem] leading-none text-ink">
                  {formatPrice(p.price)}
                  {p.purpose === "Rent" && <span className="font-sans text-sm font-normal text-ink-soft"> /month</span>}
                </p>
                {emi > 0 && (
                  <Link href="#finance" className="text-sm text-ink-soft hover:text-accent">
                    EMI from <span className="font-semibold text-ink">{formatINR(emi)}/mo</span>
                  </Link>
                )}
              </div>
              {(p.details.securityDeposit || p.details.maintenance || p.details.negotiable) && (
                <p className="mt-2 text-xs text-ink-soft">
                  {[
                    p.details.securityDeposit && `Deposit ${formatINR(p.details.securityDeposit)}`,
                    p.details.maintenance && `Maintenance ${formatINR(p.details.maintenance)}/mo`,
                    p.details.negotiable && "Price negotiable",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            <KeyFacts p={p} />

            <div className="grid grid-cols-2 gap-2">
              <ButtonA
                href={whatsappLink(s, `Hi! I'm interested in "${p.title}" (${p.locality}, ${p.city}) at ${formatPrice(p.price)}.`)}
                target="_blank"
                rel="noreferrer"
                className="bg-wa text-white hover:bg-wa/90"
                icon={<WhatsAppIcon className="size-4" />}
              >
                WhatsApp
              </ButtonA>
              <ButtonA href={telLink(s)} variant="outline" icon={<Phone className="size-4" strokeWidth={1.5} />}>
                Call now
              </ButtonA>
              <ButtonA href="#visit" className="col-span-2" icon={<CalendarCheck className="size-4" strokeWidth={1.75} />}>
                Book a free site visit
              </ButtonA>
            </div>

            <ul className="grid grid-cols-3 gap-2 text-center text-[11px] leading-tight text-ink-soft">
              {[
                { icon: ShieldCheck, text: p.verified ? "Verified listing" : "Owner details checked" },
                { icon: FileCheck2, text: "Legal & title check" },
                { icon: Landmark, text: p.purpose === "Buy" ? "Home loan help" : "Rent agreement help" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex flex-col items-center gap-1 rounded-xl border border-line px-2 py-2.5">
                  <Icon className="size-4 text-accent" strokeWidth={1.75} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-app grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0">
            {/* In-page tabs, like a product page */}
            <nav
              aria-label="Sections"
              className="no-scrollbar sticky top-[calc(var(--offer-bar,0px)+64px)] z-10 -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-line bg-bg/95 px-4 backdrop-blur sm:mx-0 sm:px-0 lg:top-[calc(var(--offer-bar,0px)+72px)]"
            >
              {[
                ["#about", "Overview"],
                ["#details", "Details"],
                p.videos?.length ? ["#video", "Video"] : null,
                p.amenities.length ? ["#amenities", "Amenities"] : null,
                emi > 0 ? ["#finance", "EMI"] : null,
              ]
                .filter((x): x is string[] => !!x)
                .map(([href, label]) => (
                  <a key={href} href={href} className="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-ink-soft transition hover:border-accent hover:text-ink">
                    {label}
                  </a>
                ))}
            </nav>

            <section id="about" className="scroll-mt-40">
              <h2 className="text-2xl text-ink">About this property</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-soft">{p.description}</p>
            </section>

            <div className="mt-10 [&>section]:scroll-mt-40">
              <PropertySpecs p={p} />
            </div>

            {!!p.videos?.length && (
              <div id="video" className="scroll-mt-40">
                <VideoReels videos={p.videos} title={p.title} className="mt-10" />
              </div>
            )}

            {p.amenities.length > 0 && (
              <section id="amenities" className="mt-10 scroll-mt-40">
                <h2 className="text-2xl text-ink">Amenities</h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {p.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2.5 rounded-xl bg-subtle px-3.5 py-2.5 text-sm text-ink">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-fg">
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {emi > 0 && (
              <section id="finance" className="mt-10 scroll-mt-40 rounded-[24px] bg-deep p-6 text-deep-fg sm:p-8">
                <p className="eyebrow">Finance this home</p>
                <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="font-display text-3xl sm:text-4xl">
                      {formatINR(emi)}
                      <span className="font-sans text-base font-normal text-deep-fg/60"> /month</span>
                    </p>
                    <p className="mt-1 text-sm text-deep-fg/60">
                      Estimated EMI on {formatPrice(loan)} loan (80%) · {s.rates.home}% · 20 yrs
                    </p>
                  </div>
                  <Link href="/loans#emi" className="text-sm font-semibold text-accent hover:underline">
                    Customise EMI →
                  </Link>
                </div>
              </section>
            )}
          </div>

          {/* Sticky booking card */}
          <aside id="visit" className="scroll-mt-28 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[24px] border border-line bg-surface p-6 shadow-soft">
              <p className="font-display text-xl text-ink">Book a free site visit</p>
              <p className="mt-1 mb-5 text-sm text-ink-soft">Share your number and we&apos;ll call to fix a convenient time.</p>
              <LeadForm compact source="property-page" propertyId={p.id} defaultInterest={p.purpose === "Rent" ? "Rent" : "Buy Property"} submitLabel="Book visit" />
            </div>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="bg-subtle py-12 sm:py-14">
          <div className="container-app">
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] text-ink">Similar properties</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
              {similar.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.08}>
                  <PropertyCard property={s} dense />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
