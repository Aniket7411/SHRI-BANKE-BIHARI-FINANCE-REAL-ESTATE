import type { MetadataRoute } from "next";
import { SITE_URL as base } from "@/lib/seo";

/** /robots.txt — keep the admin panel and APIs out of search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/review"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
