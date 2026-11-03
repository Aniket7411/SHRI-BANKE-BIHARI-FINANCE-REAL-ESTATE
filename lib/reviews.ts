import "server-only";
import { randomBytes } from "node:crypto";
import { siteUrl } from "@/lib/mail";

/** A review link a closed lead receives. */
export interface ReviewRequest {
  id: string;
  token: string;
  lead_id: string | null;
  property_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  role_hint: string;
  created_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  testimonial_id: number | null;
}

export const REVIEW_LINK_DAYS = 60;

/** Unguessable token for the public link (24 url-safe chars). */
export const newReviewToken = () => randomBytes(18).toString("base64url");

export const reviewUrl = (token: string) => `${siteUrl()}/review/${token}`;

export const isOpen = (r: Pick<ReviewRequest, "submitted_at" | "expires_at">) => !r.submitted_at && (!r.expires_at || new Date(r.expires_at).getTime() > Date.now());

/** "Bought a Flat in Gomti Nagar, Lucknow" — prefilled under the customer's name on the form. */
export function roleHint(
  property: { purpose: string; type: string; locality: string; city?: string | null } | null,
  interest: string,
) {
  if (property) return `${property.purpose === "Rent" ? "Rented" : "Bought"} a ${property.type.toLowerCase()} in ${property.locality}${property.city ? `, ${property.city}` : ""}`;
  if (/loan/i.test(interest)) return `${interest} customer`;
  if (/sell/i.test(interest)) return "Sold a property with us";
  if (/rent/i.test(interest)) return "Tenant";
  return "Home buyer";
}
