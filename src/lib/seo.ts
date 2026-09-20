import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Deliberately not NEXT_PUBLIC_SITE_URL: that is set per Vercel environment,
// so canonicals, hreflang and the sitemap would advertise the preview host.
// A canonical names the production origin from every deployment.
export const SITE_URL = "https://2027.cusec.net";

/** Every path that belongs in the sitemap, in sitemap order. */
export const PUBLIC_PATHS = [
	"/",
	"/speakers",
	"/sponsors",
	"/tickets",
	"/code-of-conduct",
	"/privacy-policy",
	"/ticket-terms",
] as const;

export function absoluteUrl(locale: string, path: string) {
	return new URL(getPathname({ locale, href: path }), SITE_URL).toString();
}

/**
 * Self-canonical plus a reciprocal hreflang set. Google discards an hreflang
 * group whose members don't all name each other, so every locale is listed on
 * every page rather than only the alternate.
 */
export function alternatesFor(locale: string, path: string) {
	const languages = Object.fromEntries(
		routing.locales.map((l) => [l, absoluteUrl(l, path)]),
	);

	return {
		canonical: absoluteUrl(locale, path),
		languages: {
			...languages,
			"x-default": absoluteUrl(routing.defaultLocale, path),
		},
	};
}
