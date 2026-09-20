"use client";

import { useEffect } from "react";
import { pickTouch } from "@/lib/attribution";

/**
 * Captures one first-party acquisition touch per full page load - whitelisted
 * UTM parameters, the external referrer's hostname, and the landing path -
 * and posts it to `/api/attribution`, which either keeps it in the pending
 * cookie (signed out, so it survives the Auth0 redirect) or attaches it to
 * the Mongo user (signed in).
 *
 * Mounted once in the root layout: client-side navigation never re-fires it,
 * so internal route changes cannot masquerade as new touches.
 */
export default function AttributionCapture() {
  useEffect(() => {
    const touch = pickTouch({
      params: new URLSearchParams(window.location.search),
      referrer: document.referrer || null,
      siteHost: window.location.hostname,
      landingPath: window.location.pathname,
    });

    try {
      void fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(touch),
        keepalive: true,
      }).catch(() => {
        // best effort - attribution must never disturb the visit
      });
    } catch {
      // private mode / fetch unavailable - nothing to recover
    }
  }, []);

  return null;
}
