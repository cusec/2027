/**
 * First-party campaign attribution.
 *
 * Vercel Web Analytics is aggregate-only: it cannot connect an anonymous
 * campaign visit to the Mongo attendee who later buys a ticket. This module
 * answers exactly that question, and only that question - it is not a second
 * copy of behavioral events.
 *
 * Everything here is pure so the route handler stays a thin shell and the
 * rules (first-touch immutability, latest-touch updates, field truncation,
 * arbitrary-query rejection) are unit-testable. See
 * `src/lib/__tests__/attribution.test.ts`.
 *
 * Privacy rules:
 *   - Only `utm_source|medium|campaign|content|term` are read from the URL;
 *     every other query parameter is ignored.
 *   - Only the referrer's hostname is stored, never its full URL.
 *   - The landing path is stored, never a full URL (queries can carry PII).
 *   - Every text field is clamped to a small limit.
 */

export interface AttributionTouch {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  referrerHost: string;
  landingPath: string;
  /** ISO timestamp of when the touch was observed. */
  capturedAt: string;
}

export interface PendingAttribution {
  first: AttributionTouch;
  latest: AttributionTouch;
}

/** The pending touch lives in a first-party cookie so it survives the Auth0 redirect. */
export const ATTRIBUTION_COOKIE_NAME = "cusec_attribution";
/** Retention: 30 days, disclosed in the privacy policy. */
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const DIRECT_SOURCE = "direct";
export const DIRECT_MEDIUM = "none";

const FIELD_LIMITS = {
  source: 100,
  medium: 100,
  campaign: 200,
  content: 200,
  term: 200,
  referrerHost: 200,
  landingPath: 512,
} as const;

/** Coerces untrusted input into a safe touch, clamping every field. */
const clamp = (value: unknown, limit: number): string =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

export function sanitizeTouch(input: unknown): AttributionTouch {
  const raw = (
    typeof input === "object" && input !== null ? input : {}
  ) as Record<string, unknown>;
  const captured =
    typeof raw.capturedAt === "string" &&
    !Number.isNaN(Date.parse(raw.capturedAt))
      ? new Date(raw.capturedAt).toISOString()
      : new Date().toISOString();

  return {
    source: clamp(raw.source, FIELD_LIMITS.source),
    medium: clamp(raw.medium, FIELD_LIMITS.medium),
    campaign: clamp(raw.campaign, FIELD_LIMITS.campaign),
    content: clamp(raw.content, FIELD_LIMITS.content),
    term: clamp(raw.term, FIELD_LIMITS.term),
    referrerHost: clamp(
      raw.referrerHost,
      FIELD_LIMITS.referrerHost,
    ).toLowerCase(),
    landingPath: clamp(raw.landingPath, FIELD_LIMITS.landingPath),
    capturedAt: captured,
  };
}

export interface PickTouchOptions {
  params: URLSearchParams;
  /** `document.referrer`, or null when unavailable. */
  referrer: string | null;
  /** This site's hostname; a referrer on it is internal, not a touch. */
  siteHost: string;
  /** Path only (no query) of the page the visitor landed on. */
  landingPath: string;
  capturedAt?: Date;
}

/**
 * Builds a touch from a landing URL. UTMs win; otherwise an external
 * referrer counts as a referral; otherwise the visit is direct - which is a
 * real controlled value, not an absence of attribution.
 */
export function pickTouch({
  params,
  referrer,
  siteHost,
  landingPath,
  capturedAt = new Date(),
}: PickTouchOptions): AttributionTouch {
  const utmSource = clamp(params.get("utm_source"), FIELD_LIMITS.source);

  let referrerHost = "";
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase();
      if (host && host !== siteHost.toLowerCase()) referrerHost = host;
    } catch {
      // unparseable referrer - treat as no referrer
    }
  }

  const touch: AttributionTouch = {
    source: utmSource || referrerHost || DIRECT_SOURCE,
    medium:
      clamp(params.get("utm_medium"), FIELD_LIMITS.medium) ||
      (referrerHost ? "referral" : DIRECT_MEDIUM),
    campaign: clamp(params.get("utm_campaign"), FIELD_LIMITS.campaign),
    content: clamp(params.get("utm_content"), FIELD_LIMITS.content),
    term: clamp(params.get("utm_term"), FIELD_LIMITS.term),
    referrerHost,
    landingPath: clamp(landingPath, FIELD_LIMITS.landingPath),
    capturedAt: capturedAt.toISOString(),
  };
  return touch;
}

/** A new acquisition touch is anything that is not a plain direct visit. */
export function isNewAcquisition(touch: { source: string }): boolean {
  return touch.source !== DIRECT_SOURCE;
}

/**
 * Pre-auth cookie state. The first touch is pinned; the latest touch moves
 * only on a new acquisition, never on an internal navigation or a direct
 * return.
 */
export function mergePendingTouch(
  pending: PendingAttribution | null,
  touch: AttributionTouch,
): PendingAttribution {
  if (!pending) return { first: touch, latest: touch };
  return {
    first: pending.first,
    latest: isNewAcquisition(touch) ? touch : pending.latest,
  };
}

/**
 * Post-auth Mongo state, same rules as the cookie: firstTouch is written
 * once, latestTouch only moves on a new acquisition. Generic over the touch
 * shape so the route can hand back the persisted (Date `capturedAt`) form.
 */
export function applyTouchToAttribution<
  T extends {
    source: string;
    medium: string;
    campaign: string;
    content: string;
    term: string;
    referrerHost: string;
    landingPath: string;
    capturedAt: string | Date;
  },
>(
  existing: { firstTouch: T | null; latestTouch: T | null } | null | undefined,
  touch: T,
): { firstTouch: T; latestTouch: T } {
  if (!existing?.firstTouch) return { firstTouch: touch, latestTouch: touch };
  return {
    firstTouch: existing.firstTouch,
    latestTouch: isNewAcquisition(touch)
      ? touch
      : (existing.latestTouch ?? existing.firstTouch),
  };
}

export function encodePendingAttribution(pending: PendingAttribution): string {
  return JSON.stringify(pending);
}

/** Safe parse of the pending cookie; garbage in, null out. */
export function decodePendingAttribution(
  raw: string | undefined | null,
): PendingAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { first?: unknown; latest?: unknown };
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.first !== "object" || typeof parsed.latest !== "object")
      return null;
    return {
      first: sanitizeTouch(parsed.first),
      latest: sanitizeTouch(parsed.latest),
    };
  } catch {
    return null;
  }
}
