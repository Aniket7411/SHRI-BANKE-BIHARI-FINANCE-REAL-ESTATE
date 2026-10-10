import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Lets visitors "Add to Home Screen" and open the site like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.fullName,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f1b2d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
