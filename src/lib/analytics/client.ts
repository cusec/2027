import {
  isAnalyticsEventName,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "./events";

/**
 * Client-side event tracking via PostHog (self-driving setup, see
 * docs/analytics-plan.md). The Vercel Web Analytics event API is Pro-only and
 * CUSEC is on Hobby, so the same catalog now ships to PostHog instead - the
 * `trackEvent` signature and every call site are unchanged.
 *
 * Privacy config (matches the plan's rules):
 *   - autocapture off - events are only the catalog's deliberate ones;
 *   - session recording off (plan defers replay pending privacy review);
 *   - pageview capture off - Vercel Web Analytics keeps pageviews;
 *   - `person_profiles: "identified_only"` - anonymous visitors are never
 *     turned into person profiles;
 *   - distinct ids are random UUIDs (User.analyticsId), never PII.
 *
 * posthog-js is dynamically imported so this module stays SSR-safe: client
 * components render on the server too, and posthog-js must never initialize
 * there. Delivery failures are swallowed - analytics must never break the
 * interaction it describes.
 */

let initialized = false;

async function getPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return null;

  const posthog = (await import("posthog-js")).default;
  if (!initialized) {
    initialized = true;
    posthog.init(key, {
      // Same-origin proxy (next.config.ts rewrites) so ad blockers don't
      // strand the events; ui_host points PostHog's toolbar at the real app.
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
    });
  }
  return posthog;
}

export function trackEvent<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventProps[K],
): void {
  if (!isAnalyticsEventName(event)) return;
  void getPostHog()
    .then((posthog) => {
      posthog?.capture(event, props);
    })
    .catch(() => {
      // best effort - never surface an analytics failure to the visitor
    });
}

/**
 * Stitches the signed-in visitor's client events to the server-side funnel
 * events (which use the same random `User.analyticsId` as their distinct
 * id). PostHog merges previously captured anonymous device events into the
 * identified person on identify.
 */
export function identifyAnalyticsUser(analyticsId: string): void {
  void getPostHog()
    .then((posthog) => {
      posthog?.identify(analyticsId);
    })
    .catch(() => {
      // best effort
    });
}
