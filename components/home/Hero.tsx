"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { BadgeCheck, Car, House, MapPin, Search, Star } from "lucide-react";
import { useRef, useState } from "react";
import { IMG } from "@/lib/img";
import { calcEmi, formatINR, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useSite } from "@/components/layout/SiteProvider";
import { site } from "@/lib/site";

const ease = [0.22, 1, 0.36, 1] as const;
const tabs = ["Buy", "Rent", "Loan"] as const;

export function Hero({ localities }: { localities: string[] }) {
  const s = useSite();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-24 pb-14 sm:pt-28 lg:pt-32 lg:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 -z-10 h-[620px] w-[620px] translate-x-1/3 -translate-y-1/3 rounded-full bg-accent-soft blur-3xl"
      />
      <div className="container-app grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-xs text-ink-soft"
          >
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-fg uppercase">
              New
            </span>
            Home loans now from {s.rates.home}% p.a.
          </motion.span>

          <h1 className="mt-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.04] text-ink">
            {["Find the home.", "We'll fund", "the dream."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  className={`block ${i === 1 ? "text-accent" : ""}`}
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, ease, delay: 0.1 + i * 0.1 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.45 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            {site.tagline}. Verified properties across Kanpur and the best loan offers from 20+ banks — handled end-to-end
            by one trusted team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.6 }}
          >
            <SearchPanel localities={localities} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-8 flex items-center gap-4"
          >
            <div className="flex -space-x-2.5">
              {[IMG.p1, IMG.p2, IMG.p3, IMG.p4].map((src) => (
                <Image key={src} src={src} alt="" width={40} height={40} className="size-10 rounded-full border-2 border-bg object-cover" />
              ))}
            </div>
            <div className="text-sm">
              <p className="flex items-center gap-1 font-semibold text-ink">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-accent text-accent" />
                ))}
                <span className="ml-1">4.9</span>
              </p>
              <p className="text-ink-soft">Trusted by 1,500+ Kanpur families</p>
            </div>
          </motion.div>
        </div>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, clipPath: "inset(8% 8% 8% 8% round 32px)" }}
            animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0% round 32px)" }}
            transition={{ duration: 1.3, ease, delay: 0.15 }}
            className="relative aspect-[4/5] overflow-hidden rounded-[32px] sm:aspect-[5/5] lg:aspect-[4/5]"
          >
            <motion.div style={{ y: imgY }} className="absolute -inset-y-[8%] inset-x-0">
              <Image
                src={IMG.heroHouse}
                alt="Modern family home at dusk"
                fill
                preload
                quality={85}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent" />
            <div className="absolute right-5 bottom-5 flex">
              <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-md">Garden Villa · ₹3.25 Cr</p>
            </div>
          </motion.div>

          <motion.div style={{ y: cardY }} className="absolute top-8 -left-4 sm:-left-10">
            <FloatCard delay={0.9} icon={<House className="size-5" strokeWidth={1.5} />} label="Home Loan" value={`${s.rates.home}%`} />
          </motion.div>
          <motion.div style={{ y: cardY }} className="absolute top-1/2 -right-3 sm:-right-8">
            <FloatCard delay={1.05} icon={<Car className="size-5" strokeWidth={1.5} />} label="Vehicle Loan" value={`${s.rates.vehicle}%`} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8, ease }}
            className="absolute -bottom-6 left-6 hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-5 shadow-soft sm:flex"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <BadgeCheck className="size-5" strokeWidth={1.5} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">100% verified listings</span>
              <span className="block text-xs text-ink-soft">Legal &amp; title checked</span>
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatCard({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 18 }}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-4 shadow-soft"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-ink text-bg">{icon}</span>
      <span>
        <span className="block text-[11px] text-ink-soft">{label} from</span>
        <span className="font-display block text-xl leading-tight text-ink">{value}</span>
      </span>
    </motion.div>
  );
}

function SearchPanel({ localities }: { localities: string[] }) {
  const s = useSite();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Buy");
  const [locality, setLocality] = useState("");
  const [type, setType] = useState("");
  const [amount, setAmount] = useState(3000000);
  const emi = calcEmi(amount, s.rates.home, 20).emi;

  const search = () => {
    const q = new URLSearchParams({ purpose: tab });
    if (locality) q.set("locality", locality);
    if (type) q.set("type", type);
    router.push(`/properties?${q}`);
  };

  return (
    <div className="mt-8 max-w-xl rounded-[26px] border border-line bg-surface p-2 shadow-soft">
      <div className="flex gap-1 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${tab === t ? "text-accent-fg" : "text-ink-soft hover:text-ink"}`}
          >
            {tab === t && (
              <motion.span layoutId="hero-tab" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
            )}
            <span className="relative">{t === "Loan" ? "Get a Loan" : t}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab !== "Loan" ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="grid gap-2 p-1 sm:grid-cols-[1fr_1fr_auto]"
          >
            <label className="flex items-center gap-2 rounded-2xl bg-subtle px-4 py-3">
              <MapPin className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
              <select value={locality} onChange={(e) => setLocality(e.target.value)} aria-label="Locality" className="w-full appearance-none bg-transparent text-sm text-ink focus:outline-none">
                <option value="">All of Kanpur</option>
                {localities.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-2xl bg-subtle px-4 py-3">
              <House className="size-4 shrink-0 text-accent" strokeWidth={1.5} />
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Property type" className="w-full appearance-none bg-transparent text-sm text-ink focus:outline-none">
                <option value="">Any type</option>
                {["Apartment", "Villa", "House", "Plot", "Commercial"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <Button onClick={search} size="lg" className="h-auto min-h-12 rounded-2xl" icon={<Search className="size-4" />}>
              Search
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="loan"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="grid items-center gap-4 p-3 sm:grid-cols-[1fr_auto]"
          >
            <label className="block">
              <span className="flex justify-between text-sm">
                <span className="text-ink-soft">Loan amount</span>
                <span className="font-semibold text-ink">{formatPrice(amount)}</span>
              </span>
              <input
                type="range"
                min={500000}
                max={20000000}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="range mt-3"
                style={{ "--fill": `${((amount - 500000) / 19500000) * 100}%` } as React.CSSProperties}
              />
              <span className="mt-2 block text-xs text-ink-soft">
                EMI ≈ <strong className="text-ink">{formatINR(emi)}/mo</strong> · 20 yrs @ {s.rates.home}%
              </span>
            </label>
            <Button onClick={() => router.push("/loans#eligibility")} size="lg" arrow className="rounded-2xl">
              Check eligibility
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
