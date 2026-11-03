/**
 * Brand constants (fixed) and default business settings.
 * Contact details, rates and stats are editable from Admin → Settings; the
 * values below are only used until Supabase is connected.
 * Read live values with `getSiteSettings()` (server) or `useSite()` (client).
 */
export const site = {
  name: "Shri Banke Bihari",
  fullName: "Shri Banke Bihari Finance & Real Estate",
  tagline: "Your one-step property & loan partner",
  category: "Finance, Financial service",
  about:
    "We are the number one DSA for all banks in Kanpur and Lucknow, providing the best service at the best ROI. We do housing loans, education loans, car loans, property loans and OD/CC limits from government banks.",
  city: "Kanpur",
} as const;

export interface Stat {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}

export interface SiteSettings {
  phone: string;
  /** Second number for calls only — never used for WhatsApp. Empty = hidden. */
  phone2: string;
  whatsapp: string; // country code + number, no "+"
  email: string;
  address: string;
  hours: string;
  instagram: string;
  instagramHandle: string;
  facebook: string;
  youtube: string;
  /** Lowest home / vehicle loan rates — taken from the Loan Products table. */
  rates: { home: number; vehicle: number };
  stats: Stat[];
}

export const defaultSettings: SiteSettings = {
  phone: "+91 63900 09950", // office line, also on WhatsApp
  phone2: "+91 92193 59906", // calls only
  whatsapp: "916390009950",
  email: "hello@shribankebihari.in",
  address: "R-1/122/235, Sarojini Nagar, Kanpur Nagar-208012",
  hours: "Mon – Sat · 10:00 AM – 7:00 PM",
  instagram: "https://www.instagram.com/shri_banke_bihari_real_estates/",
  instagramHandle: "@shri_banke_bihari_real_estates",
  facebook: "",
  youtube: "",
  rates: { home: 7.15, vehicle: 7.55 },
  stats: [
    { value: 1500, suffix: "+", label: "Families on Instagram" },
    { value: 7.15, suffix: "%", label: "Home loans from", decimals: 2 },
    { value: 20, suffix: "+", label: "Partner banks & NBFCs" },
    { value: 48, suffix: " hr", label: "Typical loan approval" },
  ],
};

/** SEO description with the current rates. */
export const describe = (s: Pick<SiteSettings, "rates">, where = "Kanpur") =>
  `Number one bank DSA in ${where}: housing, education, car and property loans and OD/CC limits from government banks — home loans from ${s.rates.home}%, car loans from ${s.rates.vehicle}%. Plus verified property to buy, sell or rent.`;

export const nav = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/properties", label: "Properties", icon: "building" },
  { href: "/loans", label: "Loans", icon: "landmark" },
  { href: "/about", label: "About", icon: "info" },
  { href: "/contact", label: "Contact", icon: "phone" },
] as const;

export function whatsappLink(s: Pick<SiteSettings, "whatsapp">, text = "Hi! I'd like to know more about your services.") {
  return `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const telLink = (s: Pick<SiteSettings, "phone">) => `tel:${s.phone.replace(/\s/g, "")}`;
export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
