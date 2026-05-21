import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
	async headers() {
		return [
			{
				source: "/splash_waveform.webm",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store, no-cache, must-revalidate, proxy-revalidate"
					},
					{
						key: "Pragma",
						value: "no-cache"
					},
					{
						key: "Expires",
						value: "0"
					}
				]
			}
		];
	}
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
export default withNextIntl(nextConfig);
