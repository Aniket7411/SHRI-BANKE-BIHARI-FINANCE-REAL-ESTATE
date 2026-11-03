const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹1,23,456 */
export const formatINR = (n: number) => `₹${inr.format(Math.round(n))}`;

/** ₹1.25 Cr / ₹85 L / ₹25,000 — compact Indian style */
export function formatPrice(n: number) {
  if (n >= 1e7) return `₹${trim(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)} L`;
  return formatINR(n);
}

const trim = (v: number) => (Math.round(v * 100) / 100).toString();

/** Standard reducing-balance EMI. */
export function calcEmi(principal: number, annualRate: number, years: number) {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualRate / 12 / 100;
  const emi = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  const total = emi * n;
  return { emi, total, interest: total - principal, months: n };
}

/** Max loan a monthly EMI budget can service. */
export function principalFromEmi(emi: number, annualRate: number, years: number) {
  const n = Math.round(years * 12);
  const r = annualRate / 12 / 100;
  if (emi <= 0) return 0;
  return r === 0 ? emi * n : (emi * ((1 + r) ** n - 1)) / (r * (1 + r) ** n);
}

/** "3.2 MB", "240 KB" */
export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB`;
}
