import type { Job } from "@/lib/types";

/** Demo openings (static). Shown until Supabase is connected; then managed from the admin panel. */
export const jobs: Job[] = [
  {
    id: "demo-1",
    slug: "property-sales-executive",
    title: "Property Sales Executive",
    department: "Real Estate",
    location: "Kanpur",
    employmentType: "Full-time",
    experience: "1–3 years",
    salary: "₹18,000 – ₹30,000 / month + incentives",
    description:
      "Help families find the right home. You'll handle enquiries, run site visits and close residential deals across Kanpur.",
    responsibilities: [
      "Call and qualify incoming leads the same day",
      "Plan and conduct property site visits",
      "Negotiate and coordinate agreement & registry",
      "Keep every lead updated in the CRM",
    ],
    requirements: ["Good Hindi & working English", "Own two-wheeler and smartphone", "Knowledge of Kanpur localities"],
    postedAt: "2026-10-01",
  },
  {
    id: "demo-2",
    slug: "loan-sales-officer",
    title: "Loan Sales Officer",
    department: "Finance",
    location: "Kanpur",
    employmentType: "Full-time",
    experience: "0–2 years",
    salary: "₹15,000 – ₹25,000 / month + incentives",
    description:
      "Source and process home, vehicle and property loans with our partner banks and NBFCs.",
    responsibilities: [
      "Explain loan options and check customer eligibility",
      "Collect and verify documents",
      "Follow up with lenders until disbursal",
    ],
    requirements: ["Graduate in any stream", "Basic understanding of CIBIL & EMIs", "Freshers with good communication welcome"],
    postedAt: "2026-10-05",
  },
];
