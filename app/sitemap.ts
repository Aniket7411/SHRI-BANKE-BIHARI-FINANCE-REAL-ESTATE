import type { MetadataRoute } from "next";
import { getProperties } from "@/lib/api";
import { SITE_URL as base } from "@/lib/seo";

/** /sitemap.xml — the main pages plus every published listing, so Google can find them. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/properties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/loans`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/careers`, changeFrequency: "weekly", priority: 0.5 },
  ];
  const listings = (await getProperties()).map((p) => ({
    url: `${base}/properties/${p.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    ...(p.createdAt ? { lastModified: p.createdAt } : {}),
    images: p.images.slice(0, 1),
  }));
  return [...pages, ...listings];
}
