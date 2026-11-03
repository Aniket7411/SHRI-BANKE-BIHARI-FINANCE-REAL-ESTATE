import { IMG } from "@/lib/img";

/** Loan photos are part of the website design, not admin content: a built-in image per product id. */
const LOAN_IMAGES: Record<string, string> = {
  "home": IMG.keys,
  "vehicle": IMG.car,
  "lap": IMG.houseClassic,
  "business": IMG.meeting,
  "personal": IMG.financeDocs,
  "transfer": IMG.signing,
  "education": IMG.meeting,
  "odcc": IMG.offices,
};

export const loanImage = (id: string) => LOAN_IMAGES[id] ?? IMG.financeDocs;
