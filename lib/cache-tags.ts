/** Cache tags for public content. Admin mutations call `revalidateTag(tag, "max")` / `updateTag(tag)`. */
export const TAGS = {
  properties: "properties",
  property: (id: string) => `property:${id}`,
  loans: "loans",
  testimonials: "testimonials",
  faqs: "faqs",
  jobs: "jobs",
  settings: "settings",
} as const;
