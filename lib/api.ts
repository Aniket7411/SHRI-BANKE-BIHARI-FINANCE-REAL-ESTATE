/**
 * Data access layer.
 * Every page reads data ONLY through these functions. Today they return static
 * data; later swap the bodies for `fetch()` calls to the CRM / admin API and the
 * UI keeps working unchanged.
 */
import { properties } from "@/lib/data/properties";
import { loanProducts } from "@/lib/data/loans";
import { faqs, testimonials } from "@/lib/data/content";

export async function getProperties() {
  return properties;
}

export async function getFeaturedProperties() {
  return properties.filter((p) => p.featured);
}

export async function getLoanProducts() {
  return loanProducts;
}

export async function getTestimonials() {
  return testimonials;
}

export async function getFaqs() {
  return faqs;
}

export async function getPropertyById(id: string) {
  return properties.find((p) => p.id === id) ?? null;
}

/** Same type or locality, excluding the current listing. */
export async function getSimilarProperties(id: string, limit = 3) {
  const base = properties.find((p) => p.id === id);
  if (!base) return [];
  return properties
    .filter((p) => p.id !== id && (p.type === base.type || p.locality === base.locality || p.purpose === base.purpose))
    .slice(0, limit);
}
