"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

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
