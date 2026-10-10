"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Bath, BedDouble, Check, MapPin, Ruler } from "lucide-react";
import { useState } from "react";
import { calcEmi, formatINR, formatPrice } from "@/lib/format";
import { site, whatsappLink } from "@/lib/site";
import type { Property } from "@/lib/types";
import { Sheet } from "@/components/ui/Sheet";
import { Button, ButtonA } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { LeadForm } from "@/components/forms/LeadForm";

export function PropertyDetail({ property, onClose }: { property: Property | null; onClose: () => void }) {
  return (
    <Sheet open={!!property} onClose={onClose} label={property?.title ?? "Property"}>
      {property && <Body key={property.id} p={property} />}
    </Sheet>
  );
}

function Body({ p }: { p: Property }) {
  const [img, setImg] = useState(0);
  const [visit, setVisit] = useState(false);
  const emi = p.purpose === "Buy" ? calcEmi(p.price * 0.8, site.rates.home, 20).emi : 0;

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden bg-subtle sm:aspect-[16/8]">
        <AnimatePresence initial={false}>
          <motion.div
            key={img}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image src={p.images[img]} alt={`${p.title} — photo ${img + 1}`} fill loading="eager" sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute bottom-3 left-3 flex gap-2">
          {p.images.map((src, i) => (
            <button
              key={src}
              onClick={() => setImg(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`relative size-14 overflow-hidden rounded-xl border-2 transition sm:size-16 ${
                i === img ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">
              {p.type} · {p.purpose === "Buy" ? "For Sale" : "For Rent"}
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-3xl text-ink">
              {p.title}
              {p.verified && <BadgeCheck className="size-5 text-accent" strokeWidth={1.75} />}
            </h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
              <MapPin className="size-4" strokeWidth={1.5} /> {p.locality}, Kanpur
            </p>
            <Link href={`/properties/${p.id}`} className="mt-2 inline-block text-sm font-semibold text-accent underline-offset-4 hover:underline">
              View full details →
            </Link>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-ink">
              {formatPrice(p.price)}
              {p.purpose === "Rent" && <span className="font-sans text-base text-ink-soft"> /mo</span>}
            </p>
            {emi > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                EMI from <span className="font-semibold text-accent">{formatINR(emi)}/mo</span>*
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-line p-1.5">
          {[
            p.beds && { icon: BedDouble, label: "Bedrooms", value: p.beds },
            p.baths && { icon: Bath, label: "Bathrooms", value: p.baths },
            { icon: Ruler, label: "Area", value: `${p.area.toLocaleString("en-IN")} ft²` },
          ]
            .filter(Boolean)
            .map((s) => {
              const { icon: Icon, label, value } = s as { icon: typeof Ruler; label: string; value: string | number };
              return (
                <div key={label} className="rounded-xl bg-subtle px-3 py-3 text-center">
                  <Icon className="mx-auto size-5 text-accent" strokeWidth={1.5} />
                  <p className="mt-1.5 text-sm font-semibold text-ink">{value}</p>
                  <p className="text-[11px] text-ink-soft">{label}</p>
                </div>
              );
            })}
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">{p.description}</p>

        <h3 className="mt-6 text-lg text-ink">Amenities</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.amenities.map((a) => (
            <li key={a} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-ink">
              <Check className="size-3.5 text-accent" /> {a}
            </li>
          ))}
        </ul>

        {emi > 0 && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink">
              Finance this home from <strong>{site.rates.home}%</strong> p.a. — we&apos;ll compare 20+ lenders for you.
            </p>
            <Link href="/loans#emi" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
              Calculate EMI →
            </Link>
          </div>
        )}

        <AnimatePresence initial={false} mode="wait">
          {visit ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 rounded-2xl border border-line p-5">
                <h3 className="mb-4 text-xl text-ink">Schedule a site visit</h3>
                <LeadForm
                  compact
                  source="property-detail"
                  propertyId={p.id}
                  defaultInterest={p.purpose === "Rent" ? "Rent" : "Buy Property"}
                  submitLabel="Book visit"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div key="ctas" exit={{ opacity: 0 }} className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button size="lg" arrow onClick={() => setVisit(true)} className="sm:flex-1">
                Schedule a visit
              </Button>
              <ButtonA
                href={whatsappLink(`Hi! I'm interested in "${p.title}" (${p.locality}) listed at ${formatPrice(p.price)}.`)}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                size="lg"
                icon={<WhatsAppIcon className="size-[18px] text-wa" />}
                className="sm:flex-1"
              >
                Enquire on WhatsApp
              </ButtonA>
            </motion.div>
          )}
        </AnimatePresence>
        {emi > 0 && (
          <p className="mt-4 text-[11px] text-ink-soft">*Indicative: 80% loan, {site.rates.home}% p.a., 20 years.</p>
        )}
      </div>
    </div>
  );
}
