import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/api/", "/auth/", "/meet", "/fr-CA/meet", "/admin", "/fr-CA/admin", "/tickets/avatar", "/tickets/demographics", "/tickets/interests", "/tickets/profile", "/tickets/purchase"],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	};
}
