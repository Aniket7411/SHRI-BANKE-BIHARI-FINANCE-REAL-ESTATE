import { getFeaturedProperties, getTestimonials } from "@/lib/api";
import { Hero } from "@/components/home/Hero";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { RatesBand } from "@/components/home/RatesBand";
import { Testimonials } from "@/components/home/Testimonials";
import { CtaBand, InstagramStrip, Marquee, Process, Services, Stats, WhyUs } from "@/components/home/Sections";

export default async function HomePage() {
  const [featured, testimonials] = await Promise.all([getFeaturedProperties(), getTestimonials()]);

  return (
    <>
      <Hero />
      <Marquee />
      <Stats />
      <Services />
      <FeaturedProperties items={featured} />
      <RatesBand />
      <Process />
      <WhyUs />
      <Testimonials items={testimonials} />
      <InstagramStrip />
      <CtaBand />
    </>
  );
}
