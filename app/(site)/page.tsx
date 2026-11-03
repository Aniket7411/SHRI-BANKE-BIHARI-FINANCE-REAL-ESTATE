import { getActiveOffers, getBanks, getCities, getSiteSettings, getFeaturedProperties, getLoanProducts, getTestimonialReels, getTestimonials } from "@/lib/api";
import { VideoReviews } from "@/components/home/VideoReviews";
import { JsonLd } from "@/components/seo/JsonLd";
import { businessLd, websiteLd } from "@/lib/seo";
import { ReelsRail } from "@/components/reels/ReelsRail";
import { OffersStrip } from "@/components/offers/OffersStrip";
import { Hero } from "@/components/home/Hero";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { RatesBand } from "@/components/home/RatesBand";
import { PartnerBanks } from "@/components/loans/PartnerBanks";
import { Testimonials } from "@/components/home/Testimonials";
import { RequirementBand } from "@/components/requirements/RequirementBand";
import { CtaBand, InstagramStrip, Marquee, Process, Services, Stats, WhyUs } from "@/components/home/Sections";

export default async function HomePage() {
  const [featured, testimonials, loans, offers, reels, settings, cities, banks] = await Promise.all([
    getFeaturedProperties(),
    getTestimonials(),
    getLoanProducts(),
    getActiveOffers(),
    getTestimonialReels(),
    getSiteSettings(),
    getCities(),
    getBanks(),
  ]);

  return (
    <>
      <JsonLd data={[businessLd(settings, cities.map((c) => c.name)), websiteLd()]} />
      <Hero />
      <Marquee />
      <Stats />
      <OffersStrip offers={offers} className="pt-4 pb-12 sm:pb-14" />
      <Services />
      <FeaturedProperties items={featured} />
      <RequirementBand />
      <ReelsRail />
      <RatesBand loans={loans} />
      <PartnerBanks banks={banks} compareHref={loans.some((l) => l.banks?.length) ? "/loans#compare" : undefined} />
      <Process />
      <WhyUs />
      <Testimonials items={testimonials} />
      <VideoReviews items={reels} />
      <InstagramStrip />
      <CtaBand />
    </>
  );
}
