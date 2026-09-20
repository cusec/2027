import { describe, expect, it } from "vitest";

import {
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_COOKIE_NAME,
  DIRECT_SOURCE,
  applyTouchToAttribution,
  decodePendingAttribution,
  encodePendingAttribution,
  mergePendingTouch,
  pickTouch,
  sanitizeTouch,
  type AttributionTouch,
} from "../attribution";
import { ticketCategoryFromName } from "../analytics/events";

const NOW = new Date("2026-09-20T12:00:00.000Z");

const campaignTouch = (
  over: Partial<AttributionTouch> = {},
): AttributionTouch => ({
  source: "instagram",
  medium: "social",
  campaign: "fall2026",
  content: "story",
  term: "",
  referrerHost: "instagram.com",
  landingPath: "/tickets",
  capturedAt: NOW.toISOString(),
  ...over,
});

describe("pickTouch", () => {
  it("reads only the whitelisted utm parameters", () => {
    const params = new URLSearchParams(
      "?utm_source=instagram&utm_medium=social&utm_campaign=fall2026&utm_content=story&evil=<script>&not_utm_source=leak",
    );
    const touch = pickTouch({
      params,
      referrer: null,
      siteHost: "2027.cusec.net",
      landingPath: "/tickets",
      capturedAt: NOW,
    });

    expect(touch.source).toBe("instagram");
    expect(touch.medium).toBe("social");
    expect(touch.campaign).toBe("fall2026");
    expect(touch.content).toBe("story");
    expect(touch.landingPath).toBe("/tickets");
    // arbitrary query parameters must never reach the stored touch
    const serialized = JSON.stringify(touch);
    expect(serialized).not.toContain("evil");
    expect(serialized).not.toContain("leak");
  });

  it("treats an external referrer as a referral touch", () => {
    const touch = pickTouch({
      params: new URLSearchParams(""),
      referrer: "https://www.reddit.com/r/ceegpeek/comments/abc/",
      siteHost: "2027.cusec.net",
      landingPath: "/",
      capturedAt: NOW,
    });

    expect(touch.source).toBe("www.reddit.com");
    expect(touch.medium).toBe("referral");
    expect(touch.referrerHost).toBe("www.reddit.com");
  });

  it("treats direct traffic as a real controlled value", () => {
    const touch = pickTouch({
      params: new URLSearchParams(""),
      referrer: "https://2027.cusec.net/speakers",
      siteHost: "2027.cusec.net",
      landingPath: "/tickets",
      capturedAt: NOW,
    });

    expect(touch.source).toBe(DIRECT_SOURCE);
    expect(touch.medium).toBe("none");
    expect(touch.referrerHost).toBe("");
  });
});

describe("sanitizeTouch", () => {
  it("clamps every text field to its limit", () => {
    const long = "x".repeat(1000);
    const touch = sanitizeTouch({
      source: long,
      medium: long,
      campaign: long,
      content: long,
      term: long,
      referrerHost: long,
      landingPath: long,
      capturedAt: NOW.toISOString(),
    });

    expect(touch).not.toBeNull();
    expect(touch!.source.length).toBe(100);
    expect(touch!.medium.length).toBe(100);
    expect(touch!.campaign.length).toBe(200);
    expect(touch!.content.length).toBe(200);
    expect(touch!.term.length).toBe(200);
    expect(touch!.referrerHost.length).toBe(200);
    expect(touch!.landingPath.length).toBe(512);
  });

  it("coerces junk input into a safe direct touch", () => {
    const touch = sanitizeTouch({ source: 42, campaign: { nested: true } });
    expect(touch).not.toBeNull();
    expect(touch!.source).toBe("");
    expect(touch!.campaign).toBe("");
    expect(touch!.capturedAt).toBeTruthy();
  });
});

describe("mergePendingTouch (pre-auth cookie state)", () => {
  it("keeps the first touch and updates the latest on a new campaign", () => {
    const first = campaignTouch({ source: "google", campaign: "spring" });
    const pending = { first, latest: first };
    const merged = mergePendingTouch(
      pending,
      campaignTouch({ campaign: "fall2026" }),
    );

    expect(merged.first.campaign).toBe("spring");
    expect(merged.latest.campaign).toBe("fall2026");
  });

  it("does not overwrite the latest touch with a direct visit", () => {
    const first = campaignTouch();
    const pending = { first, latest: first };
    const merged = mergePendingTouch(
      pending,
      campaignTouch({
        source: DIRECT_SOURCE,
        medium: "none",
        referrerHost: "",
      }),
    );

    expect(merged.latest.campaign).toBe("fall2026");
  });

  it("records a direct visit as the first touch when nothing is pending", () => {
    const direct = campaignTouch({
      source: DIRECT_SOURCE,
      medium: "none",
      referrerHost: "",
    });
    const merged = mergePendingTouch(null, direct);

    expect(merged.first.source).toBe(DIRECT_SOURCE);
    expect(merged.latest.source).toBe(DIRECT_SOURCE);
  });
});

describe("applyTouchToAttribution (post-auth Mongo state)", () => {
  it("never changes the first touch once it is set", () => {
    const existing = {
      firstTouch: campaignTouch({ source: "google", campaign: "spring" }),
      latestTouch: campaignTouch({ source: "google", campaign: "spring" }),
    };
    const applied = applyTouchToAttribution(
      existing,
      campaignTouch({ campaign: "fall2026" }),
    );

    expect(applied.firstTouch.campaign).toBe("spring");
    expect(applied.latestTouch.campaign).toBe("fall2026");
  });

  it("keeps the latest campaign touch when the visitor returns directly", () => {
    const existing = {
      firstTouch: campaignTouch(),
      latestTouch: campaignTouch(),
    };
    const applied = applyTouchToAttribution(
      existing,
      campaignTouch({
        source: DIRECT_SOURCE,
        medium: "none",
        referrerHost: "",
      }),
    );

    expect(applied.latestTouch.source).toBe("instagram");
  });

  it("seeds both touches when the user has none", () => {
    const applied = applyTouchToAttribution(null, campaignTouch());

    expect(applied.firstTouch.campaign).toBe("fall2026");
    expect(applied.latestTouch.campaign).toBe("fall2026");
  });
});

describe("pending-attribution cookie (survives the Auth0 redirect)", () => {
  it("round-trips through encode/decode", () => {
    const pending = {
      first: campaignTouch(),
      latest: campaignTouch({ campaign: "winter" }),
    };
    const decoded = decodePendingAttribution(encodePendingAttribution(pending));

    expect(decoded).not.toBeNull();
    expect(decoded!.first.campaign).toBe("fall2026");
    expect(decoded!.latest.campaign).toBe("winter");
  });

  it("returns null for garbage instead of throwing", () => {
    expect(decodePendingAttribution("not json at all")).toBeNull();
    expect(decodePendingAttribution("")).toBeNull();
    expect(decodePendingAttribution(undefined)).toBeNull();
  });

  it("sanitizes decoded touches", () => {
    const raw = JSON.stringify({
      first: { ...campaignTouch(), source: "x".repeat(500) },
      latest: campaignTouch(),
    });
    const decoded = decodePendingAttribution(raw);

    expect(decoded!.first.source.length).toBe(100);
  });

  it("exposes the cookie contract", () => {
    expect(ATTRIBUTION_COOKIE_NAME).toBe("cusec_attribution");
    expect(ATTRIBUTION_COOKIE_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
  });
});

describe("ticketCategoryFromName", () => {
  it("maps ticket names to controlled categories", () => {
    expect(ticketCategoryFromName("Student Pass")).toBe("student");
    expect(ticketCategoryFromName("Professional Pass")).toBe("professional");
    expect(ticketCategoryFromName("Passe étudiant")).toBe("student");
    expect(ticketCategoryFromName("Mystery Ticket")).toBe("other");
  });
});
