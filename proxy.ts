import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ADMIN = ["/admin/login", "/admin/auth"];

/** Keeps the Supabase session fresh and sends signed-out visitors to the admin login. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN.some((p) => pathname.startsWith(p));

  // Demo mode (no Supabase keys): the demo_uid cookie is the session; getStaff() validates it.
  if (!url || !key) {
    if (isPublic || request.cookies.get("demo_uid")?.value) return NextResponse.next();
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT locally (asymmetric signing keys, JWKS cached) and refreshes an
  // expired session; unlike getUser() it doesn't call the Auth server on every admin request.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub;

  if (!user && !isPublic) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (user && pathname === "/admin/login") return NextResponse.redirect(new URL("/admin", request.url));
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
