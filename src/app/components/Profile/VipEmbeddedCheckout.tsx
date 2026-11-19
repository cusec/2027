"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export default function VipEmbeddedCheckout({ src, fallbackUrl }: {
  src: string; fallbackUrl: string;
}) {
  const t = useTranslations("AttendeeProfile");
  const frame = useRef<HTMLIFrameElement>(null);
  const [frameSrc, setFrameSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const origin = new URL(src).origin;
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    const message = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (typeof data === "string" && data.startsWith("[iFrameSizer]")) {
        setReady(true);
        // Closing checkout can mean abandonment, so it never advances a tip.
      } else if (data && typeof data === "object") {
        if (["tt-checkout-ready", "tt-checkout-version"].includes(data.type)) setReady(true);
        if (["tt-event-page-checkout-open", "tt-basket-widget-open"].includes(data.type) && typeof data.url === "string") {
          try {
            const next = new URL(data.url, origin);
            if (next.origin !== origin) return;
            next.searchParams.set("a", "VIPAddOn");
            next.searchParams.set("widget", "true");
            next.searchParams.set("modal_widget", "true");
            setFrameSrc(next.toString());
          } catch { /* Ignore malformed provider navigation. */ }
        }
      }
    };
    window.addEventListener("message", message);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", message); };
  }, [origin]);
  // Frame events only control presentation; they never confirm a payment.
  return <div className="vip-embedded">
    {!loaded && !ready && <p role="status">{t("vip-loading-checkout")}</p>}
    <iframe ref={frame} title={t("vip-checkout")} src={frameSrc} allow="payment" referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => { setLoaded(true); frame.current?.contentWindow?.postMessage({ type: "tt-widget-frame-init" }, origin); }} />
    {slow && !ready && <details className="pass-editor__hint"><summary>{t("vip-checkout-help")}</summary><p>{t("vip-cookie-fallback")} <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">{t("vip-open-separate")}</a></p></details>}
  </div>;
}
