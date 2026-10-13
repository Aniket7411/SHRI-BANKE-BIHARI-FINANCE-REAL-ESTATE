/** Shared data shapes. Keep these in sync with the future CRM / API schema. */

export type PropertyType = "Apartment" | "Villa" | "House" | "Plot" | "Commercial";
export type Purpose = "Buy" | "Rent";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  purpose: Purpose;
  locality: string;
  price: number; // INR — total for Buy, monthly for Rent
  beds?: number;
  baths?: number;
  area: number; // sq.ft
  images: string[];
  videos?: string[];
  tags: string[];
  featured?: boolean;
  verified?: boolean;
  description: string;
  amenities: string[];
}

export interface LoanProduct {
  id: string;
  name: string;
  short: string;
  icon: "home" | "car" | "building" | "briefcase" | "wallet" | "repeat";
  rate: number; // starting % p.a.
  maxTenureYears: number;
  maxAmount: string;
  processing: string;
  highlights: string[];
  eligibility: string[];
  documents: string[];
  image: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating: number;
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
