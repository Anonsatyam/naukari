import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/server/session";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];
const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isApi = pathname.startsWith("/api");

  if (isAdminPage || isApi) {
    const isAdminApi = pathname.startsWith("/api/admin");
    const needsAuth = (isAdminPage && !PUBLIC_ADMIN_PATHS.includes(pathname)) || isAdminApi;

    if (!needsAuth) {
      return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const valid = await verifySessionToken(token);

    if (valid) {
      return NextResponse.next();
    }

    if (isAdminApi) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
