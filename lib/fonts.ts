/**
 * GLOBAL FONTS — change the families here and the whole site updates.
 *  - `display` → headings, prices, big numbers  (CSS var: --ff-display)
 *  - `body`    → everything else                 (CSS var: --ff-body)
 */
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";

export const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--ff-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const body = DM_Sans({
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});

export const fontVariables = `${display.variable} ${body.variable}`;
