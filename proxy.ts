import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ADMIN = ["/admin/login", "/admin/auth"];

/** Keeps the Supabase session fresh and sends signed-out visitors to the admin login. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN.some((p) => pathname.startsWith(p));

  if (!url || !key) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login?setup=1", request.url));
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
