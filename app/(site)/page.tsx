import { getFeaturedProperties, getLoanProducts, getLocalities, getTestimonials } from "@/lib/api";
import { Hero } from "@/components/home/Hero";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { RatesBand } from "@/components/home/RatesBand";
import { Testimonials } from "@/components/home/Testimonials";
import { CtaBand, InstagramStrip, Marquee, Process, Services, Stats, WhyUs } from "@/components/home/Sections";

export default async function HomePage() {
  const [featured, testimonials, localities, loans] = await Promise.all([getFeaturedProperties(), getTestimonials(), getLocalities(), getLoanProducts()]);

  return (
    <>
      <Hero localities={localities} />
      <Marquee />
      <Stats />
      <Services />
      <FeaturedProperties items={featured} />
      <RatesBand loans={loans} />
      <Process />
      <WhyUs />
      <Testimonials items={testimonials} />
      <InstagramStrip />
      <CtaBand />
    </>
  );
}
