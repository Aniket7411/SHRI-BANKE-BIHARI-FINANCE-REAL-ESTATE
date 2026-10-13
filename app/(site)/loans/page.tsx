import type { Metadata } from "next";
import { getFaqs, getLoanProducts, getSiteSettings } from "@/lib/api";
import { IMG } from "@/lib/img";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { LoanProducts } from "@/components/loans/LoanProducts";
import { EmiCalculator } from "@/components/loans/EmiCalculator";
import { EligibilityChecker } from "@/components/loans/EligibilityChecker";
import { LeadForm } from "@/components/forms/LeadForm";
import { Process } from "@/components/home/Sections";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: "Home & Vehicle Loans",
    description: `Home loans from ${s.rates.home}% and vehicle loans from ${s.rates.vehicle}% in Kanpur. EMI calculator, eligibility check and doorstep documentation.`,
  };
}

export default async function LoansPage() {
  const [products, faqs, s] = await Promise.all([getLoanProducts(), getFaqs(), getSiteSettings()]);

  return (
    <>
      <PageHero
        crumb="Loans"
        eyebrow="Finance made simple"
        title={
          <>
            The right loan, <em className="text-accent">at the lowest rate.</em>
          </>
        }
        text="We compare 20+ banks and NBFCs for you, handle every document and keep you updated on WhatsApp until disbursal."
        image={IMG.signing}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            ["Home Loan", s.rates.home],
            ["Vehicle Loan", s.rates.vehicle],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-2xl border border-white/10 px-5 py-3 !bg-white/10">
              <p className="text-xs text-deep-fg/70">{k} from</p>
              <p className="font-display text-2xl">{v}% p.a.</p>
            </div>
          ))}
        </div>
      </PageHero>

      <section id="products" className="container-app scroll-mt-24 py-16 sm:py-24">
        <SectionHeading eyebrow="Our loan products" title="Finance for every milestone." className="mb-10" />
        <LoanProducts items={products} />
      </section>

      <section id="emi" className="container-app scroll-mt-24 pb-16 sm:pb-24">
        <SectionHeading
          eyebrow="EMI calculator"
          title={
            <>
              Know your EMI <em className="text-accent">before you apply.</em>
            </>
          }
          text="Slide to adjust amount, rate and tenure. Hover the chart to see the split between principal and interest."
          className="mb-10"
        />
        <Reveal>
          <EmiCalculator />
        </Reveal>
      </section>

      <section id="eligibility" className="container-app scroll-mt-24 pb-16 sm:pb-24">
        <SectionHeading eyebrow="Eligibility check" title="How much can you borrow?" text="A quick estimate based on what lenders typically allow. Takes 10 seconds." className="mb-10" />
        <Reveal>
          <EligibilityChecker />
        </Reveal>
      </section>

      <Process />

      <section className="container-app grid gap-14 py-20 sm:py-28 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="FAQs" title="Questions, answered." />
          <Reveal className="mt-8">
            <Accordion items={faqs} />
          </Reveal>
        </div>
        <Reveal id="apply" className="scroll-mt-24 self-start rounded-[28px] border border-line bg-surface p-6 shadow-soft sm:p-10">
          <p className="eyebrow">Apply in 60 seconds</p>
          <h2 className="mt-3 text-3xl text-ink">Start your loan application</h2>
          <p className="mt-2 mb-8 text-sm text-ink-soft">Share a few details and an advisor will call you with the best offers.</p>
          <LeadForm source="loans-apply" defaultInterest="Home Loan" submitLabel="Get best offers" />
        </Reveal>
      </section>
    </>
  );
}
