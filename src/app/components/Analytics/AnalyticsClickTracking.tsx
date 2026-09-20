"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { isAnalyticsEventName } from "@/lib/analytics/events";

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

      const props: Record<string, string> = {};
      for (const attribute of element.attributes) {
        if (attribute.name.startsWith(ATTRIBUTE_PREFIX) && attribute.name !== `${ATTRIBUTE_PREFIX}event`) {
          props[attribute.name.slice(ATTRIBUTE_PREFIX.length)] = attribute.value;
        }
      }

      trackEvent(name, props as never);
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
