import type { Metadata } from "next";
import { getProperties } from "@/lib/api";
import { localities } from "@/lib/data/properties";
import { IMG } from "@/lib/img";
import { PageHero } from "@/components/ui/PageHero";
import { PropertyExplorer } from "@/components/property/PropertyExplorer";
import { CtaBand } from "@/components/home/Sections";

export const metadata: Metadata = {
  title: "Properties in Kanpur",
  description: "Verified apartments, villas, houses, plots and commercial spaces for sale and rent across Kanpur.",
};

export default async function PropertiesPage() {
  const items = await getProperties();
  return (
    <>
      <PageHero
        crumb="Properties"
        eyebrow="Buy · Rent · Invest"
        title={
          <>
            Verified properties <em className="text-accent">across Kanpur.</em>
          </>
        }
        text="Every listing is legally checked, every price is honest. Save your favourites and book a visit in seconds."
        image={IMG.apartmentBlock3}
      />
      <PropertyExplorer items={items} localities={localities} />
      <CtaBand />
    </>
  );
}
