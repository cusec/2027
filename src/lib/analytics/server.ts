import { track } from "@vercel/analytics/server";
import { isAnalyticsEventName, type AnalyticsEventName, type AnalyticsEventProps } from "./events";

/**
 * Server-side event tracking, best-effort by contract: a failure to deliver
 * an event must never fail the primary operation (auth, profile saves,
 * ticket linking). Awaits delivery so serverless handlers don't lose the
 * event when the invocation ends, but reports rather than throws.
 */
export async function trackServerEvent<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventProps[K]
): Promise<void> {
  if (!isAnalyticsEventName(event)) return;
  try {
    await track(event, props);
  } catch (error) {
    console.error(`[analytics] failed to deliver "${event}":`, error);
  }
}
