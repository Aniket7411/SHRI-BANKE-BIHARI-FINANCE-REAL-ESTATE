import { cityList } from "@/lib/cities";
import { site, type SiteSettings } from "@/lib/site";
import type { Faq, Property } from "@/lib/types";

/** Public origin for canonical links, sitemaps and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const absolute = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

/** Search keywords: every service × every city we cover. */
export function keywords(cities: string[]) {
  const per = (c: string) => [`property in ${c}`, `flats for sale in ${c}`, `plots in ${c}`, `house for rent in ${c}`, `commercial property ${c}`, `home loan ${c}`, `vehicle loan ${c}`, `real estate agent ${c}`];
  return [...cities.flatMap(per), "home loan lowest interest rate", "property loan", "verified property listings", site.fullName];
}

/* ------------------------------------------------------------------ schema.org (JSON-LD) */

/** The business: a real-estate agent that also arranges loans, serving each city. */
export function businessLd(s: SiteSettings, cities: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": ["RealEstateAgent", "FinancialService"],
    "@id": `${SITE_URL}/#business`,
    name: site.fullName,
    alternateName: site.name,
    description: `One-step property and loan solution in ${cityList(cities)}: verified listings, home & vehicle loans from 20+ banks, legal checks and registry support.`,
    url: SITE_URL,
    logo: absolute("/icon.png"),
    image: absolute("/apple-icon.png"),
    telephone: s.phone,
    email: s.email,
    address: { "@type": "PostalAddress", streetAddress: s.address, addressRegion: "Uttar Pradesh", addressCountry: "IN" },
    areaServed: cities.map((name) => ({ "@type": "City", name })),
    openingHours: "Mo-Sa 10:00-19:00",
    priceRange: "₹₹",
    sameAs: [s.instagram, s.facebook, s.youtube].filter(Boolean),
    makesOffer: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Buy, sell & rent property" } },
      { "@type": "Offer", itemOffered: { "@type": "LoanOrCredit", name: "Home loan", annualPercentageRate: s.rates.home } },
      { "@type": "Offer", itemOffered: { "@type": "LoanOrCredit", name: "Vehicle loan", annualPercentageRate: s.rates.vehicle } },
    ],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: site.fullName,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#business` },
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/properties?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

/** A listing page: the offer (price, currency, sale / rent) on the place itself. */
export function listingLd(p: Property) {
  const url = absolute(`/properties/${p.id}`);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": url,
    url,
    name: p.title,
    description: p.description,
    image: p.images.map(absolute),
    datePosted: p.createdAt,
    about: {
      "@type": p.category === "Residential" ? "Accommodation" : "Place",
      name: p.title,
      address: { "@type": "PostalAddress", addressLocality: `${p.locality}, ${p.city}`, addressRegion: "Uttar Pradesh", addressCountry: "IN" },
      ...(p.category === "Residential" && p.beds ? { numberOfBedrooms: p.beds } : {}),
      ...(p.baths ? { numberOfBathroomsTotal: p.baths } : {}),
      floorSize: { "@type": "QuantitativeValue", value: p.area, unitCode: "FTK" },
    },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "INR",
      businessFunction: p.purpose === "Rent" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#business` },
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absolute(it.path) })),
  };
}

export function faqLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
