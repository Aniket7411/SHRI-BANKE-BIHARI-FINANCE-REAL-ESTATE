import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Bath, BedDouble, Check, ChevronRight, MapPin, Phone, Ruler, Tag } from "lucide-react";
import { getProperties, getPropertyById, getSimilarProperties, getSiteSettings } from "@/lib/api";
import { calcEmi, formatINR, formatPrice } from "@/lib/format";
import { videoEmbed } from "@/lib/video";
import { telLink, whatsappLink } from "@/lib/site";
import { Gallery } from "@/components/property/Gallery";
import { ShareSave } from "@/components/property/ShareSave";
import { PropertyCard } from "@/components/property/PropertyCard";
import { LeadForm } from "@/components/forms/LeadForm";
import { ButtonA } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Reveal } from "@/components/ui/Reveal";

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
    title: `${p.title}, ${p.locality}`,
    description: `${p.title} in ${p.locality}, Kanpur — ${formatPrice(p.price)}${p.purpose === "Rent" ? "/month" : ""}. ${p.description}`,
    openGraph: { images: [p.images[0]] },
  };
}

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) notFound();
  const [similar, s] = await Promise.all([getSimilarProperties(id), getSiteSettings()]);
  const loan = p.price * 0.8;
  const emi = p.purpose === "Buy" ? calcEmi(loan, s.rates.home, 20).emi : 0;

  const specs = [
    p.beds && { icon: BedDouble, label: "Bedrooms", value: p.beds },
    p.baths && { icon: Bath, label: "Bathrooms", value: p.baths },
    { icon: Ruler, label: "Built-up area", value: `${p.area.toLocaleString("en-IN")} sq.ft` },
    { icon: Tag, label: "Price / sq.ft", value: p.purpose === "Buy" ? formatINR(p.price / p.area) : "—" },
  ].filter(Boolean) as { icon: typeof Ruler; label: string; value: string | number }[];

  return (
    <div className="pt-20 lg:pt-24">
      <div className="container-app">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 py-4 text-xs text-ink-soft">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <ChevronRight className="size-3" />
          <Link href="/properties" className="hover:text-ink">
            Properties
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-ink">{p.title}</span>
        </nav>

        <div className="flex flex-col justify-between gap-4 pb-6 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-bg">{p.purpose === "Buy" ? "For Sale" : "For Rent"}</span>
              <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink">{p.type}</span>
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="mt-4 flex items-center gap-2 text-[clamp(1.8rem,4vw,2.8rem)] leading-tight text-ink">
              {p.title}
              {p.verified && <BadgeCheck className="size-6 shrink-0 text-accent" strokeWidth={1.75} aria-label="Verified" />}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-ink-soft">
              <MapPin className="size-4" strokeWidth={1.5} /> {p.locality}, Kanpur
            </p>
          </div>
          <ShareSave id={p.id} title={p.title} />
        </div>
      </div>

      <div className="container-app grid gap-10 pb-20 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <Gallery images={p.images} title={p.title} />

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-line p-4">
                <Icon className="size-5 text-accent" strokeWidth={1.5} />
                <p className="mt-3 font-display text-lg text-ink">{value}</p>
                <p className="text-xs text-ink-soft">{label}</p>
              </div>
            ))}
          </div>

          {!!p.videos?.length && (
            <section className="mt-10">
              <h2 className="text-2xl text-ink">Video tour</h2>
              <div className="mt-4 grid gap-4">
                {p.videos.map((v) => {
                  const embed = videoEmbed(v);
                  return embed ? (
                    <iframe
                      key={v}
                      src={embed}
                      title={`${p.title} video tour`}
                      loading="lazy"
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-video w-full rounded-2xl border border-line"
                    />
                  ) : (
                    <video key={v} src={v} controls preload="metadata" playsInline className="aspect-video w-full rounded-2xl border border-line bg-black" />
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl text-ink">About this property</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{p.description}</p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl text-ink">Amenities</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {p.amenities.map((a) => (
                <li key={a} className="flex items-center gap-3 rounded-xl bg-subtle px-4 py-3 text-sm text-ink">
                  <span className="grid size-6 place-items-center rounded-full bg-accent text-accent-fg">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          </section>

          {emi > 0 && (
            <section className="mt-10 rounded-[24px] bg-deep p-6 text-deep-fg sm:p-8">
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

        {/* Sticky enquiry card */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[24px] border border-line bg-surface p-6 shadow-soft">
            <p className="text-sm text-ink-soft">{p.purpose === "Buy" ? "Asking price" : "Monthly rent"}</p>
            <p className="font-display text-4xl text-ink">
              {formatPrice(p.price)}
              {p.purpose === "Rent" && <span className="font-sans text-base font-normal text-ink-soft"> /mo</span>}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <ButtonA
                href={whatsappLink(s, `Hi! I'm interested in "${p.title}" (${p.locality}) at ${formatPrice(p.price)}.`)}
                target="_blank"
                rel="noreferrer"
                className="bg-wa text-white hover:bg-wa/90"
                icon={<WhatsAppIcon className="size-4" />}
              >
                WhatsApp
              </ButtonA>
              <ButtonA href={telLink(s)} variant="outline" icon={<Phone className="size-4" strokeWidth={1.5} />}>
                Call
              </ButtonA>
            </div>
            <div className="my-6 h-px bg-line" />
            <p className="mb-4 font-display text-lg text-ink">Book a site visit</p>
            <LeadForm
              compact
              source="property-page"
              propertyId={p.id}
              defaultInterest={p.purpose === "Rent" ? "Rent" : "Buy Property"}
              submitLabel="Book visit"
            />
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="bg-subtle py-16 sm:py-20">
          <div className="container-app">
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] text-ink">Similar properties</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s, i) => (
                <Reveal key={s.id} delay={i * 0.08}>
                  <PropertyCard property={s} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
