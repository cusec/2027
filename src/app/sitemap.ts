import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl, alternatesFor, isTranslated, PUBLIC_PATHS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
	return PUBLIC_PATHS.flatMap((path) => {
		const locales = isTranslated(path)
			? routing.locales
			: [routing.defaultLocale];

		return locales.map((locale) => ({
			url: absoluteUrl(locale, path),
			changeFrequency: "weekly" as const,
			priority: path === "/" ? 1 : 0.6,
			alternates: { languages: alternatesFor(locale, path).languages },
		}));
	});
}
