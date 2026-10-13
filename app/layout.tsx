import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { getSiteSettings } from "@/lib/api";
import { describe, site } from "@/lib/site";
import { Providers } from "@/components/layout/Providers";
import { themeInitScript } from "@/components/layout/ThemeSwitcher";

export async function generateMetadata(): Promise<Metadata> {
  const description = describe(await getSiteSettings());
  return {
    title: {
      default: `${site.fullName} — ${site.tagline}`,
      template: `%s · ${site.name} Finance & Real Estate`,
    },
    description,
    applicationName: site.fullName,
    appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
    openGraph: {
      title: site.fullName,
      description,
      locale: "en_IN",
      type: "website",
    },
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
