import { IMG } from "@/lib/img";
import type { Faq, Testimonial } from "@/lib/types";

export const steps = [
  { title: "Tell us your goal", text: "Share what you want — a home, a car, a buyer, or funds. One quick call or WhatsApp." },
  { title: "Get matched", text: "We shortlist verified properties and compare offers from 20+ lenders for you." },
  { title: "Paperwork, handled", text: "Site visits, legal checks, documentation and bank processing — all done by us." },
  { title: "Keys & funds", text: "Registry, disbursal and handover. Plus support long after the deal is closed." },
];

export const testimonials: Testimonial[] = [
  {
    name: "Rohit Agarwal",
    role: "Home buyer, Swaroop Nagar",
    quote:
      "They found us a 3 BHK in two weeks and got our home loan approved at a better rate than our own bank offered. Completely stress-free.",
    avatar: IMG.p2,
    rating: 5,
  },
  {
    name: "Neha Srivastava",
    role: "Vehicle loan customer",
    quote:
      "Car loan sanctioned in under two days with doorstep document pickup. The team kept me updated on WhatsApp at every step.",
    avatar: IMG.p3,
    rating: 5,
  },
  {
    name: "Amit Tripathi",
    role: "Sold a plot in Panki",
    quote:
      "Honest valuation, genuine buyers and smooth registry. I'd recommend Shri Banke Bihari to anyone selling property in Kanpur.",
    avatar: IMG.p4,
    rating: 5,
  },
  {
    name: "Priya Mishra",
    role: "Balance transfer, Kakadeo",
    quote: "They moved my home loan to a lower rate and my EMI dropped noticeably. Transparent and very professional.",
    avatar: IMG.p1,
    rating: 5,
  },
];

export const faqs: Faq[] = [
  {
    q: "What is the lowest home loan interest rate you can offer?",
    a: "Home loans start from 7.15% p.a. The final rate depends on your credit score, income profile and the lender. We compare offers from multiple banks to get you the best one.",
  },
  {
    q: "Do you charge for loan consultation?",
    a: "The first consultation and eligibility check are completely free. Any service charges are explained upfront before you proceed.",
  },
  {
    q: "Can you help me sell my property?",
    a: "Yes. We do a free valuation, list your property, bring verified buyers and assist with the agreement and registry.",
  },
  {
    q: "Which areas of Kanpur do you cover?",
    a: "All major areas including Swaroop Nagar, Civil Lines, Kalyanpur, Kakadeo, Tilak Nagar, Govind Nagar, Panki, Azad Nagar and more.",
  },
  {
    q: "How fast can a vehicle loan be approved?",
    a: "With complete documents, vehicle loans are typically approved within 24–48 hours, starting at 7.55% p.a.",
  },
];

export const services = {
  realEstate: [
    "Buy residential & commercial property",
    "Sell with free valuation",
    "Rentals & tenant verification",
    "Plots, legal & title checks",
  ],
  finance: [
    "Home loans from 7.15%",
    "Vehicle loans from 7.55%",
    "Loan against property",
    "Balance transfer & top-up",
  ],
};

export const marquee = [
  "Home Loans",
  "Vehicle Loans",
  "Buy Property",
  "Sell Property",
  "Rentals",
  "Loan Against Property",
  "Plot Advisory",
  "Balance Transfer",
  "Documentation Support",
];
