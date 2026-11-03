/** Demo-mode session cookie (holds the signed-in demo profile id). */
export const DEMO_COOKIE = "demo_uid";

export const demoCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};
