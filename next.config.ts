import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
	// Dev-only: Next serves /_next assets to `localhost` alone unless told
	// otherwise, so a cusec.net dev host would load with no CSS without this.
	// Kept as a standing allowance -- nothing in the repo actually sets such a
	// host up, and there is no `local.cusec.net` DNS or hosts entry. In-page
	// checkout is tested on a deploy (docs/ticket-tailor/REQUIRED.md 2): Ticket
	// Tailor sends `frame-ancestors 'self' https://cusec.net https://*.cusec.net`,
	// and a port-less CSP source only matches :443, so a local dev server on
	// :3000 is frame-refused however it is named.
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
