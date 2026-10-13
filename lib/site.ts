/**
 * Brand constants (fixed) and default business settings.
 * Contact details, rates and stats are editable from Admin → Settings; the
 * values below are only used until Supabase is connected.
 * Read live values with `getSiteSettings()` (server) or `useSite()` (client).
 */
export const site = {
  name: "Shri Banke Bihari",
  fullName: "Shri Banke Bihari Finance & Real Estate",
  tagline: "Kanpur's #1 Real Estate & Loan Experts",
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
  phone: "+91 90000 00000",
  whatsapp: "919000000000",
  email: "hello@shribankebihari.in",
  address: "Swaroop Nagar, Kanpur, Uttar Pradesh 208002",
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
export const describe = (s: Pick<SiteSettings, "rates">) =>
  `Buy, sell or rent property in Kanpur and get home & vehicle loans at the best rates — Home Loans from ${s.rates.home}%, Vehicle Loans from ${s.rates.vehicle}%.`;

export const nav = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/properties", label: "Properties", icon: "building" },
  { href: "/loans", label: "Loans", icon: "landmark" },
  { href: "/contact", label: "Contact", icon: "phone" },
] as const;

export function whatsappLink(s: Pick<SiteSettings, "whatsapp">, text = "Hi! I'd like to know more about your services.") {
  return `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const telLink = (s: Pick<SiteSettings, "phone">) => `tel:${s.phone.replace(/\s/g, "")}`;
