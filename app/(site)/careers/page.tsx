import type { Metadata } from "next";
import { getJobs } from "@/lib/api";
import { IMG } from "@/lib/img";
import { site } from "@/lib/site";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { JobBoard } from "@/components/careers/JobBoard";

export const metadata: Metadata = {
  title: "Careers",
  description: `Join ${site.fullName} in Kanpur. Open roles in property sales, loans and operations.`,
};

export default async function CareersPage() {
  const jobs = await getJobs();

  return (
    <>
      <PageHero
        crumb="Careers"
        eyebrow="Work with us"
        title={
          <>
            Build your career <em className="text-accent">in Kanpur.</em>
          </>
        }
        text="We're a growing team helping families buy homes and get the right loans. Good incentives, real training and room to grow."
        image={IMG.team}
      />
      <section className="container-app py-16 sm:py-24">
        <SectionHeading
          eyebrow={jobs.length ? `${jobs.length} open ${jobs.length === 1 ? "role" : "roles"}` : "Openings"}
          title="Current openings"
          text="Don't see the right role? Send a general application and we'll reach out when something fits."
          className="mb-10"
        />
        <Reveal>
          <JobBoard jobs={jobs} />
        </Reveal>
      </section>
    </>
  );
}
