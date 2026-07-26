"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import TicketsSection from "@/app/components/Tickets/TicketsSection";
import type { TicketType, TicketWidgetConfig } from "@/lib/ticketTailor";

interface PurchaseStepClientProps {
  tickets: TicketType[];
  widgetConfig: TicketWidgetConfig;
  alreadyComplete: boolean;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

// There is no client-side "payment succeeded" signal from the Ticket Tailor
// popup (it's a hosted, cross-origin widget) — the only reliable source of
// truth is the async order.created webhook, which auto-links the account
// (see src/app/api/ticket-tailor/webhook/route.ts). So once the user clicks
// Buy, poll the wizard status for a bounded window rather than assuming
// completion when the popup closes.
export default function PurchaseStepClient({
  tickets,
  widgetConfig,
  alreadyComplete,
}: PurchaseStepClientProps) {
  const t = useTranslations("TicketWizard");
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [complete, setComplete] = useState(alreadyComplete);

  useEffect(() => {
    if (!waiting || complete) return;

    let elapsedMs = 0;
    const interval = setInterval(async () => {
      elapsedMs += POLL_INTERVAL_MS;
      try {
        const res = await fetch("/api/ticket-wizard/status");
        const data = await res.json();
        if (data.purchaseComplete) {
          setComplete(true);
          setWaiting(false);
          clearInterval(interval);
          router.push("/tickets");
          return;
        }
      } catch {
        // transient failure - keep polling until the timeout window closes
      }
      if (elapsedMs >= POLL_TIMEOUT_MS) {
        setTimedOut(true);
        setWaiting(false);
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [waiting, complete, router]);

  if (complete) {
    return (
      <div className="wizard-intro-card">
        <p>{t("purchase-already-complete")}</p>
      </div>
    );
  }

  return (
    <>
      <TicketsSection
        tickets={tickets}
        widgetConfig={widgetConfig}
        onBuyClicked={() => {
          setTimedOut(false);
          setWaiting(true);
        }}
      />
      {waiting && <p className="wizard-purchase-status">{t("purchase-waiting-confirmation")}</p>}
      {timedOut && (
        <p className="wizard-purchase-status wizard-purchase-status--timeout">
          {t("purchase-fallback-manual-link")}
        </p>
      )}
    </>
  );
}
