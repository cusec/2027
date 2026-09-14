"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Opens every new page at its top.
 *
 * In-page anchor links scroll smoothly (globals.css), and without this a page
 * change could inherit that and glide down from wherever the last page was
 * left. A new page jumps straight to the top instead. Two cases keep their
 * position on purpose: a link to an anchor, which the browser scrolls to, and
 * back/forward, where the browser restores where you were. Renders nothing.
 */
export default function V2ScrollToTop() {
  const pathname = usePathname();
  const firstRender = useRef(true);
  const cameFromHistory = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      cameFromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (cameFromHistory.current) {
      cameFromHistory.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
