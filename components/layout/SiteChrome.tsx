import { getActiveOffers, getCities, getDocuments, getReels, getSiteSettings } from "@/lib/api";
import { ReelsProvider } from "@/components/reels/ReelsProvider";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import { WhatsAppWidget } from "./WhatsAppWidget";
import { ScrollProgress } from "./ScrollProgress";
import { SiteProvider } from "./SiteProvider";
import { CityProvider } from "./CityProvider";
import { DocumentsStrip } from "./DocumentsStrip";
import { OfferBanner } from "@/components/offers/OfferBanner";
import { OfferPopup } from "@/components/offers/OfferPopup";
import { RequirementProvider } from "@/components/requirements/RequirementProvider";

/** Public-site frame: offer bar, header, documents strip, footer, mobile tab bar, WhatsApp widget, reels viewer and offer popup, with live settings and cities. */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [settings, offers, documents, reels, cities] = await Promise.all([getSiteSettings(), getActiveOffers(), getDocuments(), getReels(), getCities()]);
  return (
    <SiteProvider value={settings}>
      <CityProvider cities={cities}>
        <ReelsProvider reels={reels}>
          <RequirementProvider>
            <ScrollProgress />
            <OfferBanner offers={offers} />
            <Header />
            {/* --offer-bar-space is set by <OfferBanner> while the bar is showing */}
            <main className="flex-1 pt-[var(--offer-bar-space,0px)] transition-[padding] duration-300">{children}</main>
            <DocumentsStrip documents={documents} />
            <Footer settings={settings} />
            <MobileTabBar />
            <WhatsAppWidget />
            <OfferPopup offers={offers} />
          </RequirementProvider>
        </ReelsProvider>
      </CityProvider>
    </SiteProvider>
  );
}
