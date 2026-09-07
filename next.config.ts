import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
	// Dev-only: Next serves /_next assets to `localhost` alone unless told
	// otherwise. Ticket Tailor will only let its checkout be framed by a
	// cusec.net origin, so local testing runs on https://local.cusec.net
	// (a DNS/hosts entry pointing at 127.0.0.1) - which needs listing here or
	// the page loads with no CSS.
	allowedDevOrigins: ["local.cusec.net", "*.cusec.net"],
	async headers() {
		return [
			{
				source: "/splash_waveform.webm",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable"
					}
				]
			}
		];
	}
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
export default withNextIntl(nextConfig);
