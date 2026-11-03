/** Cache tags for public content. Admin mutations call `revalidateTag(tag, "max")` / `updateTag(tag)`. */
export const TAGS = {
  properties: "properties",
  property: (id: string) => `property:${id}`,
  loans: "loans",
  banks: "banks",
  testimonials: "testimonials",
  faqs: "faqs",
  jobs: "jobs",
  settings: "settings",
  offers: "offers",
  documents: "documents",
  reels: "reels",
  cities: "cities",
} as const;
