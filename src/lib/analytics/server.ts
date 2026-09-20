import { PostHog } from "posthog-node";
import {
  isAnalyticsEventName,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "./events";

/**
 * Server-side event tracking via PostHog (replaces @vercel/analytics/server,
 * which is Pro-only - CUSEC is on Hobby). Best-effort by contract: a failure
 * to deliver an event must never fail the primary operation (auth, profile
 * saves, ticket linking).
 *
 * `distinctId` should be the user's random `analyticsId` (never an email,
 * Auth0 id, or Mongo id) so server events stitch with the same visitor's
 * client events in PostHog funnels. Falls back to a shared "server" id for
 * events that have no user context.
 *
 * posthog-node batches; on serverless a frozen invocation would lose the
 * batch, so each call creates a throwaway client that flushes immediately
 * (flushAt 1 / no interval) and awaits `shutdown()`. Event volume here is
 * tiny (saves, signups, purchases), so the overhead is irrelevant.
 */
export async function trackServerEvent<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventProps[K],
  distinctId?: string,
): Promise<void> {
  if (!isAnalyticsEventName(event)) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({
      distinctId: distinctId ?? "server",
      event,
      properties: props,
    });
  } catch (error) {
    console.error(`[analytics] failed to deliver "${event}":`, error);
  } finally {
    // Flushes the queued capture before the invocation can freeze.
    await client.shutdown();
  }
}
