import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { auth0 } from "./lib/auth0";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Combined proxy (Next.js 16's middleware convention).
 *
 * Two concerns are composed here in a single file because Next.js only allows
 * one proxy/middleware:
 *   1. Auth0 (@auth0/nextjs-auth0) — owns the `/auth/*` routes (login, logout,
 *      callback, profile, access-token) and rolls/refreshes the session cookie
 *      on every request.
 *   2. next-intl — locale detection + `NEXT_LOCALE` cookie. Uses
 *      `localePrefix: 'never'`, so the locale never appears in the URL.
 *
 * Order: Auth0 runs first so it can rotate the session cookie; next-intl then
 * produces the response, and we carry Auth0's Set-Cookie values onto it.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth0 fully owns its own routes — return its response directly.
  if (pathname.startsWith("/auth")) {
    return await auth0.middleware(request);
  }

  // Let Auth0 process the request (refreshes/rotates the session cookie).
  const authResponse = await auth0.middleware(request);

  // If Auth0 decided to redirect or otherwise short-circuit, honour it.
  if (authResponse.headers.get("location") || authResponse.status !== 200) {
    return authResponse;
  }

  // next-intl handles locale detection + cookie + internal rewrite.
  const intlResponse = intlMiddleware(request);

  // Carry Auth0's session cookies (rolling session) onto the intl response so
  // they aren't dropped.
  authResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });

  return intlResponse;
}

export const config = {
  // Match all pathnames except for
  // - /api, /trpc, /_next, /_vercel
  // - files containing a dot (e.g. favicon.ico)
  // `/auth/*` is intentionally NOT excluded so Auth0 can handle it.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
