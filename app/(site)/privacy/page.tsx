import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/api";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.fullName} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  const contact = (
    <>
      <a href={`mailto:${s.email}`}>{s.email}</a>, call {s.phone}, or write to us at {s.address}
    </>
  );

  return (
    <LegalPage
      title="Privacy Policy"
      updated="3 November 2026"
      intro={
        <>
          <p>
            This policy explains how <strong>{site.fullName}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and protects your personal information when you use this
            website, contact us, or use our property and loan services. We follow the Digital Personal Data Protection Act, 2023 and other applicable Indian laws.
          </p>
          <p>By using this website or sharing your details with us, you agree to this policy.</p>
        </>
      }
      sections={[
        {
          id: "collect",
          title: "Information we collect",
          body: (
            <>
              <p>We only collect what we need to help you:</p>
              <ul>
                <li>
                  <strong>Contact details</strong> — name, mobile number and email, when you fill a form, request a callback, save a property requirement or chat with us.
                </li>
                <li>
                  <strong>Your requirement</strong> — what you&apos;re looking for (buy or rent, city, locality, property type, budget, bedrooms) and any notes you add.
                </li>
                <li>
                  <strong>Loan information</strong> — when you apply for a loan, details such as income, employment and the documents a bank requires (KYC, income proof,
                  property papers).
                </li>
                <li>
                  <strong>Job applications</strong> — your CV and details, if you apply on our Careers page.
                </li>
                <li>
                  <strong>Usage data</strong> — basic technical information (browser, device, pages visited, the ad or link that brought you here). Saved properties and your
                  chosen city are stored only in your own browser.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <ul>
              <li>To call, WhatsApp or email you about your enquiry and show you suitable properties.</li>
              <li>To send you alerts about new properties that match your saved requirement — only if you turned alerts on.</li>
              <li>To process your loan application with the banks and NBFCs you choose.</li>
              <li>To arrange site visits, documentation and follow-ups.</li>
              <li>To improve our website and services, and to prevent spam and misuse.</li>
              <li>To meet legal, regulatory and record-keeping requirements.</li>
            </ul>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>
                <strong>We never sell your personal information.</strong> We share it only when needed to serve you:
              </p>
              <ul>
                <li>With banks and NBFCs, for the loan you apply for, and only with your consent.</li>
                <li>With property owners or builders, when you ask to visit or buy a property.</li>
                <li>With trusted service providers who run our website, database, email and hosting, under confidentiality.</li>
                <li>With authorities, when the law requires it.</li>
              </ul>
            </>
          ),
        },
        {
          id: "alerts",
          title: "Property alerts and messages",
          body: (
            <p>
              If you save a requirement with alerts on, we may email you when a matching property is listed, and our team may call or WhatsApp you about it. Every alert email has a{" "}
              <strong>Stop alerts</strong> link, and you can also ask us to stop at any time. We send each property to you only once.
            </p>
          ),
        },
        {
          id: "security",
          title: "How we keep it safe",
          body: (
            <p>
              Your data is stored on secure, access-controlled servers. Only authorised team members can see it, and sales staff see only the enquiries assigned to them. No
              system is 100% secure, but we take reasonable steps to protect your information from loss, misuse and unauthorised access.
            </p>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <p>
              We keep your information while we&apos;re helping you and for as long as needed afterwards for legal, tax and banking records. When it&apos;s no longer needed, we
              delete or anonymise it.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>You can ask us to:</p>
              <ul>
                <li>tell you what personal information we hold about you;</li>
                <li>correct or update it;</li>
                <li>delete it, where we&apos;re not required by law to keep it;</li>
                <li>stop calls, messages or alerts.</li>
              </ul>
              <p>To do any of this, contact us at {contact}. We&apos;ll respond within a reasonable time.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and local storage",
          body: (
            <p>
              We use small amounts of browser storage to remember your saved properties, chosen city and theme, and to note which campaign brought you to us. We don&apos;t use them
              to track you across other websites. You can clear them any time from your browser settings.
            </p>
          ),
        },
        {
          id: "links",
          title: "Other websites",
          body: <p>Our site links to WhatsApp, Instagram, Google Maps and bank websites. Their own privacy policies apply when you use them.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: <p>We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above shows the latest version.</p>,
        },
        {
          id: "contact",
          title: "Contact us",
          body: (
            <p>
              Questions or requests about your data? Email {contact}. See also our <Link href="/terms">Terms of Use</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
