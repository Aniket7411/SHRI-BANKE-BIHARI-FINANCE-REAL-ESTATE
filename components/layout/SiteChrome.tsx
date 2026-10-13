import { getSiteSettings } from "@/lib/api";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import { WhatsAppWidget } from "./WhatsAppWidget";
import { ScrollProgress } from "./ScrollProgress";
import { SiteProvider } from "./SiteProvider";

/** Public-site frame: header, footer, mobile tab bar and WhatsApp widget, with live settings. */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <SiteProvider value={settings}>
      <ScrollProgress />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <MobileTabBar />
      <WhatsAppWidget />
    </SiteProvider>
  );
}
