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

  // PostHog events are sent to a same-origin /ingest path and proxied to
  // PostHog's ingestion + static-asset hosts, so ad blockers and tracking
  // lists that block *.posthog.com don't strand the analytics. Only wired
  // when a project key exists - with no key there is nothing to proxy.
  async rewrites() {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return [];
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    const assetsHost = host.replace(".i.posthog.com", "-assets.i.posthog.com");
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${assetsHost}/static/:path*`,
      },
      { source: "/ingest/:path*", destination: `${host}/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
