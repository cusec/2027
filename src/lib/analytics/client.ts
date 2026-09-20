import { track } from "@vercel/analytics";
import { isAnalyticsEventName, type AnalyticsEventName, type AnalyticsEventProps } from "./events";

/**
 * Client-side event tracking. Thin on purpose: the catalog in `events.ts`
 * owns the names and shapes, this only forwards to Vercel and swallows
 * delivery failures - analytics must never break the interaction it
 * describes.
 */
export function trackEvent<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventProps[K]
): void {
  if (!isAnalyticsEventName(event)) return;
  try {
    track(event, props);
  } catch {
    // best effort - never surface an analytics failure to the visitor
  }
}
