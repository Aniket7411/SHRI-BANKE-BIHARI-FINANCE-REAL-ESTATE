import type { Metadata } from "next";
import { getActiveOffers, getBanks, getCities, getFaqs, getLoanProducts, getSiteSettings } from "@/lib/api";
import { cityList } from "@/lib/cities";
import { faqLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { OffersStrip } from "@/components/offers/OffersStrip";
import { IMG } from "@/lib/img";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { LoanProducts } from "@/components/loans/LoanProducts";
import { PartnerBanks } from "@/components/loans/PartnerBanks";
import { BankRateComparison } from "@/components/loans/BankRateComparison";
import { EmiCalculator } from "@/components/loans/EmiCalculator";
import { EligibilityChecker } from "@/components/loans/EligibilityChecker";
import { LeadForm } from "@/components/forms/LeadForm";
import { Process } from "@/components/home/Sections";

export async function generateMetadata(): Promise<Metadata> {
  const [s, cities] = await Promise.all([getSiteSettings(), getCities()]);
  const where = cityList(cities.map((c) => c.name)) || "Kanpur";
  return {
    title: `Home Loan from ${s.rates.home}% & Vehicle Loan in ${where}`,
    description: `Compare home loans from ${s.rates.home}% and vehicle loans from ${s.rates.vehicle}% across 20+ banks in ${where}. Free EMI calculator, eligibility check and doorstep documentation.`,
    alternates: { canonical: "/loans" },
  };
}

export default async function LoansPage() {
  const [products, faqs, s, offers, banks] = await Promise.all([getLoanProducts(), getFaqs(), getSiteSettings(), getActiveOffers(), getBanks()]);

  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqLd(faqs)} />}
      <PageHero
        crumb="Loans"
        eyebrow="Finance made simple"
        title={
          <>
            The right loan, <em className="text-accent">at the lowest rate.</em>
          </>
        }
        text={`We compare ${banks.length > 1 ? `${banks.length} partner banks` : "government and private banks"} for you, handle every document and keep you updated on WhatsApp until disbursal.`}
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

      <OffersStrip offers={offers} eyebrow="Loan offers" title="Save more on your loan this season." className="pt-10 sm:pt-14" />

      {products.length > 0 && (
        <section id="products" className="container-app scroll-mt-24 py-10 sm:py-12">
          <SectionHeading eyebrow="Our loan products" title="Finance for every milestone." className="mb-10" />
          <LoanProducts items={products} />
        </section>
      )}

      {products.some((p) => p.banks?.length) && (
        <section id="compare" className="container-app scroll-mt-24 pb-12 sm:pb-16">
          <SectionHeading
            eyebrow="Compare bank rates"
            title={
              <>
                Every bank, <em className="text-accent">side by side.</em>
              </>
            }
            text="Live rates from our partner banks, lowest first. Pick a loan, or switch to “All loans” to see every bank at a glance."
            className="mb-8"
          />
          <BankRateComparison loans={products} />
        </section>
      )}

      <PartnerBanks banks={banks} className="pt-0 sm:pt-0" />

      <section id="emi" className="container-app scroll-mt-24 pb-12 sm:pb-16">
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
          <EmiCalculator loans={products} />
        </Reveal>
      </section>

      <section id="eligibility" className="container-app scroll-mt-24 pb-12 sm:pb-16">
        <SectionHeading eyebrow="Eligibility check" title="How much can you borrow?" text="A quick estimate based on what lenders typically allow. Takes 10 seconds." className="mb-10" />
        <Reveal>
          <EligibilityChecker />
        </Reveal>
      </section>

      <Process />

      <section className={`container-app grid gap-10 py-14 sm:py-16 ${faqs.length ? "lg:grid-cols-2" : "max-w-3xl"}`}>
        {faqs.length > 0 && (
          <div>
            <SectionHeading eyebrow="FAQs" title="Questions, answered." />
            <Reveal className="mt-8">
              <Accordion items={faqs} />
            </Reveal>
          </div>
        )}
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
