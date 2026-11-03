import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { getCities, getSiteSettings } from "@/lib/api";
import { cityList } from "@/lib/cities";
import { SITE_URL, keywords } from "@/lib/seo";
import { describe, site } from "@/lib/site";
import { Providers } from "@/components/layout/Providers";
import { themeInitScript } from "@/components/layout/ThemeSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const [s, cities] = await Promise.all([getSiteSettings(), getCities()]);
  const names = cities.map((c) => c.name);
  const where = cityList(names) || site.city;
  const description = describe(s, where);
  const title = `Property & Home Loans in ${where} | ${site.fullName}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${site.name} Finance & Real Estate`,
    },
    description,
    keywords: keywords(names),
    applicationName: site.fullName,
    category: "real estate",
    alternates: { canonical: "/" },
    appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    openGraph: {
      title,
      description,
      siteName: site.fullName,
      url: "/",
      locale: "en_IN",
      type: "website",
      images: [{ url: "/og-family.jpg", width: 1200, height: 630, alt: `${site.fullName} — property & loans in ${where}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-family.jpg"] },
    robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="ivory" className={`${fontVariables} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
