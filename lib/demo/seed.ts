import { defaultSettings } from "@/lib/site";

type Row = Record<string, unknown>;

/** Ids of the sample listings older local databases were seeded with — removed on next load. */
export const OLD_SAMPLE_PROPERTY_IDS = [
  "swaroop-nagar-3bhk", "civil-lines-villa", "kalyanpur-house", "kakadeo-2bhk-rent", "panki-plot", "mall-road-commercial",
  "tilak-nagar-duplex", "azad-nagar-house-rent", "govind-nagar-modern", "gt-road-shop-residence", "kidwai-nagar-shop",
  "barra-commercial-plot", "shyam-nagar-2bhk", "kakadeo-mixed-use", "gomti-nagar-3bhk", "hazratganj-showroom", "sushant-golf-city-plot",
];

/** Old demo logins (admin@demo.in etc.) — removed from older local databases on next load. */
export const OLD_DEMO_EMAILS = ["admin@demo.in", "amit@demo.in", "priya@demo.in"];

/** Business settings minus `rates` (those come from the loan products). */
function settingsData(): Row {
  const data: Row = { ...defaultSettings, siteMode: "live" };
  delete data.rates;
  return data;
}

/**
 * First-load contents of the local fallback database (used only while Supabase isn't
 * connected): business settings and nothing else — no sample content, no logins.
 */
export function buildSeed(): { tables: Record<string, Row[]> } {
  return { tables: { site_settings: [{ id: 1, data: settingsData() }] } };
}
