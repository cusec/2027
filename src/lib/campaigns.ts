export const CAMPAIGN_CHANNELS = ["meetup", "school", "social", "partner"] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export function campaignDestination(value: string): string | null {
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.length > 512) {
    return null;
  }

  try {
    const url = new URL(path, "https://2027.cusec.net");
    if (["/api", "/admin", "/auth"].some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function campaignLandingUrl(
  origin: string,
  destination: string,
  id: string,
  channel: CampaignChannel,
): URL {
  const url = new URL(destination, origin);
  url.searchParams.set("utm_source", channel);
  url.searchParams.set("utm_medium", channel === "meetup" ? "qr" : channel === "social" ? "social" : "outreach");
  url.searchParams.set("utm_campaign", id);
  if (url.pathname === "/meet" || url.pathname === "/fr-CA/meet") {
    url.searchParams.set("campaign", id);
  }
  return url;
}
