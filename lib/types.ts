/** Shared data shapes. Keep these in sync with the future CRM / API schema. */

export type PropertyCategory = "Residential" | "Commercial" | "Semi-commercial";
/** One of PROPERTY_TYPES in lib/property-meta.ts (kept open so old rows still load). */
export type PropertyType = string;
export type Purpose = "Buy" | "Rent";
export type AreaUnit = "sqft" | "sqm" | "sqyd";

/**
 * Optional, India-specific listing attributes (stored as `properties.details` jsonb).
 * Field list, labels and options live in lib/property-meta.ts. Areas are in sq.ft.
 */
export interface PropertyDetails {
  structure?: string;
  floor?: number;
  totalFloors?: number;
  facing?: string;
  position?: string;
  roadWidth?: number;
  openSides?: number;
  cornerPlot?: boolean;
  balconies?: number;
  livingHalls?: number;
  dining?: boolean;
  storeRoom?: boolean;
  poojaRoom?: boolean;
  servantRoom?: boolean;
  studyRoom?: boolean;
  parking?: number;
  parkingType?: string;
  furnishing?: string;
  carpetArea?: number;
  plotArea?: number;
  plotLength?: number;
  plotWidth?: number;
  areaUnit?: AreaUnit;
  ownership?: string;
  approval?: string;
  approvedBy?: string;
  reraId?: string;
  possession?: string;
  possessionDate?: string;
  transaction?: string;
  age?: string;
  flooring?: string;
  waterSupply?: string;
  powerBackup?: string;
  boundaryWall?: boolean;
  frontage?: number;
  ceilingHeight?: number;
  washroomType?: string;
  pantry?: boolean;
  suitableFor?: string[];
  maintenance?: number;
  negotiable?: boolean;
  securityDeposit?: number;
  lockIn?: number;
  tenants?: string[];
  availableFrom?: string;
}

export interface Property {
  id: string;
  title: string;
  category: PropertyCategory;
  type: PropertyType;
  purpose: Purpose;
  city: string; // e.g. Kanpur, Lucknow (Admin → Cities)
  locality: string;
  price: number; // INR — total for Buy, monthly for Rent
  beds?: number;
  baths?: number;
  area: number; // sq.ft (built-up / super area; plot area for plots)
  images: string[];
  videos?: string[];
  tags: string[];
  featured?: boolean;
  verified?: boolean;
  description: string;
  amenities: string[];
  details: PropertyDetails;
  createdAt?: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  short: string;
  icon: "home" | "car" | "building" | "briefcase" | "wallet" | "repeat" | "graduation" | "landmark";
  rate: number; // starting % p.a. — the lowest bank rate when banks have rates, else the product's own rate
  maxTenureYears: number;
  maxAmount: string;
  processing: string;
  highlights: string[];
  eligibility: string[];
  documents: string[];
  image: string;
  /** Bank-wise rates for this product, lowest first (Admin → Bank rates). */
  banks?: BankOffer[];
}

export type BankKind = "Government" | "Private" | "NBFC" | "Housing finance";

export interface Bank {
  id: string;
  name: string;
  kind: BankKind;
  logo: string; // empty → initials badge
}

/** One bank's current rate for one loan product. */
export interface BankOffer {
  bank: Bank;
  rateMin: number;
  rateMax: number | null;
  processing: string;
  note: string;
  updatedAt: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number;
  /** Came in through a review link after a closed deal. */
  verifiedBuyer?: boolean;
}

export interface Faq {
  q: string;
  a: string;
}

export type LeadInterest =
  | "Buy Property"
  | "Sell Property"
  | "Rent"
  | "Home Loan"
  | "Vehicle Loan"
  | "Loan Against Property"
  | "Education Loan"
  | "OD/CC Limit"
  | "Other";

export interface Job {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  experience: string;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedAt: string; // ISO date
}

/** UTM / click-id parameters captured from the landing URL. */
export type Utm = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content" | "gclid" | "fbclid" | "landing", string>>;

export interface Lead {
  name: string;
  phone: string;
  email?: string;
  interest: LeadInterest;
  budget?: string;
  message?: string;
  callbackSlot?: string;
  source: string; // which form / page produced the lead
  propertyId?: string;
  utm?: Utm;
}

/* ---------------------------------------------------------------- CMS: offers & documents */

export type OfferTheme = "diwali" | "gold" | "default";

export interface Offer {
  id: string;
  title: string;
  description: string;
  code?: string | null;
  discountText: string; // e.g. "Zero processing fee"
  appliesTo: string; // e.g. "Home loan" / "All"
  startsAt: string | null; // ISO; null = already running
  endsAt: string | null; // ISO; null = no end date
  showBanner: boolean;
  showPopup: boolean;
  ctaLabel: string;
  ctaHref: string;
  theme: OfferTheme;
}

export type DocumentKind = "pdf" | "image" | "link";

/** Firm certificates & letters shown in the public "Certifications & Documents" strip. */
export interface SiteDocument {
  id: string;
  title: string;
  category: string; // e.g. "RERA", "GST", "Bank partner"
  fileUrl: string;
  fileKind: DocumentKind;
  sizeBytes?: number | null;
}

/** A customer video review attached to a testimonial. */
export interface TestimonialReel {
  name: string;
  role: string;
  reelUrl: string;
}

/** A short vertical video (Instagram reel / YouTube Short) for the site-wide reels viewer. */
export interface Reel {
  id: string;
  title: string;
  url: string;
  /** Poster image: the admin's cover, else the linked property's photo, else the YouTube thumbnail. */
  cover?: string;
  property?: { id: string; title: string; city: string; locality: string; price: number; purpose: Property["purpose"] } | null;
}
