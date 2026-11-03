import type { Offer, OfferTheme } from "@/lib/types";

export type OfferStatus = "live" | "scheduled" | "expired";

/** Where an offer sits relative to `now` (ignores the active flag). */
export function offerStatus(o: Pick<Offer, "startsAt" | "endsAt">, now: number): OfferStatus {
  if (o.startsAt && Date.parse(o.startsAt) > now) return "scheduled";
  if (o.endsAt && Date.parse(o.endsAt) <= now) return "expired";
  return "live";
}

export const isLive = (o: Pick<Offer, "startsAt" | "endsAt">, now: number) => offerStatus(o, now) === "live";

const DAY = 86_400_000;

/** "Ends today" / "Ends tomorrow" / "Ends in 5 days" / "Ends 25 Oct" — null when open-ended. */
export function endsLabel(o: Pick<Offer, "endsAt">, now: number): string | null {
  if (!o.endsAt) return null;
  const end = Date.parse(o.endsAt);
  const hours = (end - now) / 3_600_000;
  if (hours <= 0) return "Ended";
  if (hours < 24) return hours < 2 ? "Ends in under 2 hours" : `Ends in ${Math.floor(hours)} hours`;
  const days = Math.ceil((end - now) / DAY);
  if (days <= 1) return "Ends tomorrow";
  if (days <= 21) return `Ends in ${days} days`;
  return `Valid till ${new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

/** Visual treatment per theme (gradients are hard-coded so they read the same in every site theme). */
export const OFFER_THEMES: Record<OfferTheme, { label: string; bar: string; card: string; chip: string; glow: string }> = {
  diwali: {
    label: "Diwali / festive",
    bar: "bg-[linear-gradient(90deg,#4c0519_0%,#9f1239_30%,#ea580c_70%,#f59e0b_100%)] text-white",
    card: "bg-[radial-gradient(120%_120%_at_0%_0%,#fbbf24_0%,#ea580c_35%,#9f1239_70%,#4c0519_100%)] text-white",
    chip: "bg-white/15 text-white ring-1 ring-white/30",
    glow: "shadow-[0_20px_50px_-20px_rgba(234,88,12,0.65)]",
  },
  gold: {
    label: "Gold",
    bar: "bg-[linear-gradient(90deg,#1c1407_0%,#713f12_40%,#b45309_75%,#d4a017_100%)] text-white",
    card: "bg-[radial-gradient(120%_120%_at_0%_0%,#facc15_0%,#b45309_40%,#422006_100%)] text-white",
    chip: "bg-white/15 text-white ring-1 ring-white/30",
    glow: "shadow-[0_20px_50px_-20px_rgba(180,83,9,0.6)]",
  },
  default: {
    label: "Classic",
    bar: "bg-deep text-deep-fg",
    card: "bg-deep text-deep-fg",
    chip: "bg-white/10 text-deep-fg ring-1 ring-white/20",
    glow: "shadow-soft",
  },
};

export const offerTheme = (t: string | null | undefined) => OFFER_THEMES[(t as OfferTheme) in OFFER_THEMES ? (t as OfferTheme) : "default"];
