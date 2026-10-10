import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { site } from "@/lib/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { WhatsAppWidget } from "@/components/layout/WhatsAppWidget";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { Providers } from "@/components/layout/Providers";
import { themeInitScript } from "@/components/layout/ThemeSwitcher";

export const metadata: Metadata = {
  title: {
    default: `${site.fullName} — ${site.tagline}`,
    template: `%s · ${site.name} Finance & Real Estate`,
  },
  description: site.description,
  applicationName: site.fullName,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  openGraph: {
    title: site.fullName,
    description: site.description,
    locale: "en_IN",
    type: "website",
  },
};

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
        <Providers>
          <ScrollProgress />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <MobileTabBar />
          <WhatsAppWidget />
        </Providers>
      </body>
    </html>
  );
}
