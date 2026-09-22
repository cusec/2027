import { describe, expect, it } from "vitest";
import { campaignDestination, campaignLandingUrl } from "../campaigns";

describe("campaign links", () => {
  it("keeps an internal destination and its existing query", () => {
    expect(campaignDestination("/meet?event=montreal-2026-10-01")).toBe(
      "/meet?event=montreal-2026-10-01",
    );
  });

  it("rejects destinations that leave the site or enter private routes", () => {
    expect(campaignDestination("https://example.com")).toBeNull();
    expect(campaignDestination("//example.com")).toBeNull();
    expect(campaignDestination("/admin")).toBeNull();
    expect(campaignDestination("/api/users")).toBeNull();
  });

  it("adds campaign attribution without dropping the meetup event", () => {
    const url = campaignLandingUrl(
      "https://2027.cusec.net",
      "/meet?event=montreal-2026-10-01",
      "abc123",
      "meetup",
    );
    expect(url.pathname).toBe("/meet");
    expect(url.searchParams.get("event")).toBe("montreal-2026-10-01");
    expect(url.searchParams.get("utm_campaign")).toBe("abc123");
    expect(url.searchParams.get("utm_source")).toBe("meetup");
    expect(url.searchParams.get("campaign")).toBe("abc123");
  });
});
