"use client";

import { useEffect } from "react";
import { identifyAnalyticsUser } from "@/lib/analytics/client";

/**
 * Identifies the signed-in visitor to PostHog by their random analytics id,
 * stitching the client-side events (CTA clicks, FAQ opens) captured before
 * sign-in to the server-side funnel events that use the same id as their
 * distinct id. Rendered from the ticket-flow pages, where the funnel lives.
 */
export default function PostHogIdentify({ analyticsId }: { analyticsId: string }) {
  useEffect(() => {
    identifyAnalyticsUser(analyticsId);
  }, [analyticsId]);

  return null;
}
