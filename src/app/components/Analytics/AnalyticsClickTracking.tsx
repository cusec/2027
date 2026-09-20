"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import {
  EVENT_PROPERTY_KEYS,
  isAnalyticsEventName,
  type AnalyticsEventProps,
} from "@/lib/analytics/events";

const ATTRIBUTE_PREFIX = "data-analytics-";

/**
 * One document-level click listener that forwards events from elements
 * carrying `data-analytics-*` attributes:
 *
 *   <a {...analyticsAttributes("ticket_cta_clicked", { location: "hero", destination: "passes" })} />
 *
 * This is what lets server components emit tracking metadata without being
 * converted into client components. Mounted once in the root layout, so it
 * survives client-side navigation and never re-subscribes.
 */
export default function AnalyticsClickTracking() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest(`[${ATTRIBUTE_PREFIX}event]`);
      if (!element) return;

      const name = element.getAttribute(`${ATTRIBUTE_PREFIX}event`);
      if (!name || !isAnalyticsEventName(name)) return;

      // Attributes are untyped by construction, so keep only the keys the
      // catalog allows for this event - a stray or typo'd attribute must
      // never reach Vercel.
      const allowed = EVENT_PROPERTY_KEYS[name] as readonly string[];
      const props: Record<string, string> = {};
      for (const attribute of element.attributes) {
        if (!attribute.name.startsWith(ATTRIBUTE_PREFIX) || attribute.name === `${ATTRIBUTE_PREFIX}event`) {
          continue;
        }
        const key = attribute.name.slice(ATTRIBUTE_PREFIX.length);
        if (!allowed.includes(key)) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[analytics] ignored unknown property "${key}" on "${name}"`);
          }
          continue;
        }
        props[key] = attribute.value;
      }

      trackEvent(name, props as AnalyticsEventProps[typeof name]);
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
