import { headers } from "next/headers";

/**
 * Absolute origin for this request, e.g. `https://tickets.cusec.net`.
 *
 * Auth0's logout takes the `returnTo` we hand it and passes it straight
 * through as `post_logout_redirect_uri` without validating or absolutising
 * it. A relative value therefore reaches Auth0 as `post_logout_redirect_uri=
 * %2Ftickets`, which matches nothing in Allowed Logout URLs, and the user
 * lands on Auth0's error page instead of coming back to the site. So a
 * missing `APP_BASE_URL` has to fall back to something absolute rather than
 * to an empty string.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";

  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
