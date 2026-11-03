import type { Metadata } from "next";
import { getCities, getProperties } from "@/lib/api";
import { cityList } from "@/lib/cities";
import { IMG } from "@/lib/img";
import { PageHero } from "@/components/ui/PageHero";
import { PropertyExplorer } from "@/components/property/PropertyExplorer";
import { CtaBand } from "@/components/home/Sections";

export async function generateMetadata(): Promise<Metadata> {
  const where = cityList((await getCities()).map((c) => c.name)) || "Kanpur";
  return {
    title: `Flats, Houses, Plots & Shops for Sale and Rent in ${where}`,
    description: `Browse legally verified flats, villas, houses, plots and commercial spaces for sale and rent in ${where}. Honest prices, free site visits and home loan help.`,
    // Filtered views (?city=, ?type=…) all point back to the main listing page.
    alternates: { canonical: "/properties" },
  };
}

export default async function PropertiesPage() {
  const [items, cities] = await Promise.all([getProperties(), getCities()]);
  return (
    <>
      <PageHero
        crumb="Properties"
        eyebrow="Buy · Rent · Invest"
        title={
          <>
            Verified properties <em className="text-accent">across {cityList(cities.map((c) => c.name)) || "Kanpur"}.</em>
          </>
        }
        text="Every listing is legally checked, every price is honest. Save your favourites and book a visit in seconds."
        image={IMG.apartmentBlock3}
      />
      <PropertyExplorer items={items} />
      <CtaBand />
    </>
  );
}
