/**
 * Business-wide settings. Replace the placeholder contact details
 * (marked TODO) with the client's real ones before going live.
 */
export const site = {
  name: "Shri Banke Bihari",
  fullName: "Shri Banke Bihari Finance & Real Estate",
  tagline: "Kanpur's #1 Real Estate & Loan Experts",
  description:
    "Buy, sell or rent property in Kanpur and get home & vehicle loans at the best rates — Home Loans from 7.15%, Vehicle Loans from 7.55%.",
  city: "Kanpur",
  phone: "+91 90000 00000", // TODO: real number
  whatsapp: "919000000000", // TODO: real WhatsApp number (country code, no +)
  email: "hello@shribankebihari.in", // TODO: real email
  address: "Swaroop Nagar, Kanpur, Uttar Pradesh 208002", // TODO: real address
  hours: "Mon – Sat · 10:00 AM – 7:00 PM",
  instagram: "https://www.instagram.com/shri_banke_bihari_real_estates/",
  instagramHandle: "@shri_banke_bihari_real_estates",
  rates: { home: 7.15, vehicle: 7.55 },
} as const;

export const nav = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/properties", label: "Properties", icon: "building" },
  { href: "/loans", label: "Loans", icon: "landmark" },
  { href: "/contact", label: "Contact", icon: "phone" },
] as const;

export function whatsappLink(text = "Hi! I'd like to know more about your services.") {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const telLink = `tel:${site.phone.replace(/\s/g, "")}`;
