// Plain JavaScript (not next.config.ts): servers without Next's native compiler — e.g. Hostinger's
// Node.js hosting, whose glibc is too old — can't compile a TypeScript config.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Images uploaded from the admin panel live in Supabase Storage.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

/** @type {import("next").NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Free stock imagery (Unsplash). Swap for your own CDN / CRM uploads later.
    // Query params (?w=…&q=…) are allowed so the optimizer fetches a pre-sized original.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
      ...(supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
    qualities: [60, 75, 85],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
