import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/api";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms for using the ${site.fullName} website and services.`,
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const s = await getSiteSettings();

  return (
    <LegalPage
      title="Terms of Use"
      updated="3 November 2026"
      intro={
        <p>
          These terms apply to your use of this website and the services of <strong>{site.fullName}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;), {s.address}. By using the
          website you agree to them. If you don&apos;t agree, please don&apos;t use the website.
        </p>
      }
      sections={[
        {
          id: "services",
          title: "What we do",
          body: (
            <p>
              We are a real estate consultancy and a loan facilitator (Direct Selling Agent) for banks and NBFCs. We help you find, buy, sell or rent property and help you apply for
              loans. <strong>We are not a bank or lender.</strong> All loans are approved and given by the lending bank or NBFC under its own terms.
            </p>
          ),
        },
        {
          id: "listings",
          title: "Property listings",
          body: (
            <ul>
              <li>We check listings before publishing them, but details (price, area, availability, approvals) can change, and some come from owners or builders.</li>
              <li>Photos may be representative. Please visit the property and check all documents yourself, or with your lawyer, before you pay any money.</li>
              <li>A listing is not an offer to sell. Every deal is subject to a written agreement between buyer and seller.</li>
            </ul>
          ),
        },
        {
          id: "rates",
          title: "Loan rates and calculators",
          body: (
            <ul>
              <li>Interest rates, processing fees and offers shown are indicative. They can change at any time and depend on the lender&apos;s policy, your credit profile and RBI guidelines.</li>
              <li>The EMI and eligibility calculators give estimates only. The final amount, rate and EMI are decided by the lender.</li>
              <li>We don&apos;t guarantee that a loan will be approved.</li>
            </ul>
          ),
        },
        {
          id: "fees",
          title: "Fees",
          body: (
            <p>
              Any brokerage or service fee will be told to you clearly before you commit, and agreed in writing. Bank charges such as processing fees, stamp duty and registration are
              paid as per the bank&apos;s and government&apos;s rules.
            </p>
          ),
        },
        {
          id: "your-info",
          title: "Information you give us",
          body: (
            <p>
              Please give us correct and complete information. By submitting a form you allow us to contact you by phone, WhatsApp, SMS or email about your enquiry, even if your
              number is on a Do-Not-Disturb list. You can ask us to stop at any time. How we handle your data is explained in our <Link href="/privacy">Privacy Policy</Link>.
            </p>
          ),
        },
        {
          id: "use",
          title: "Using the website",
          body: (
            <ul>
              <li>Don&apos;t submit false enquiries, spam, or someone else&apos;s details without their permission.</li>
              <li>Don&apos;t copy, scrape or reuse our listings, photos or content without written permission.</li>
              <li>Don&apos;t try to break, overload or get unauthorised access to the website or its admin area.</li>
            </ul>
          ),
        },
        {
          id: "content",
          title: "Our content",
          body: <p>The website&apos;s text, design, logo and photos belong to {site.fullName} or are used with permission. Customer reviews are the views of those customers.</p>,
        },
        {
          id: "liability",
          title: "Limitation of liability",
          body: (
            <p>
              We work hard to keep the website accurate and available, but it&apos;s provided &ldquo;as is&rdquo;. To the extent the law allows, we are not responsible for losses from
              relying on website information without checking it, from decisions of banks, builders or sellers, or from interruptions to the website.
            </p>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          body: <p>These terms are governed by the laws of India. Any dispute will be handled by the courts at Kanpur, Uttar Pradesh.</p>,
        },
        {
          id: "changes",
          title: "Changes",
          body: <p>We may update these terms from time to time. The &ldquo;Last updated&rdquo; date above shows the latest version.</p>,
        },
        {
          id: "contact",
          title: "Contact us",
          body: (
            <p>
              Questions about these terms? Email <a href={`mailto:${s.email}`}>{s.email}</a> or call {s.phone}.
            </p>
          ),
        },
      ]}
    />
  );
}
