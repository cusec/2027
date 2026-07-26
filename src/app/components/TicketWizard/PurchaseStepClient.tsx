"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import TicketsSection from "@/app/components/Tickets/TicketsSection";
import type { TicketType, TicketWidgetConfig } from "@/lib/ticketTailor";

interface PurchaseStepClientProps {
  tickets: TicketType[];
  widgetConfig: TicketWidgetConfig;
  alreadyComplete: boolean;
  purchasedTicketName: string | null;
}

const POLL_INTERVAL_MS = 4000;

// The Ticket Tailor checkout is a cross-origin embed - there is no reliable
// client-side "payment succeeded" signal from it. The only source of truth
// is the async order.created webhook, which auto-links the account (see
// src/app/api/ticket-tailor/webhook/route.ts). So poll the wizard status in
// the background while this page is open, rather than trying to detect a
// click inside the iframe.
export default function PurchaseStepClient({
  tickets,
  widgetConfig,
  alreadyComplete,
  purchasedTicketName,
}: PurchaseStepClientProps) {
  const t = useTranslations("TicketWizard");
  const [complete, setComplete] = useState(alreadyComplete);
  const [ticketName, setTicketName] = useState(purchasedTicketName);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const checkoutConfigured = Boolean(
    widgetConfig.boxOfficeName && widgetConfig.checkoutEmbedUrl
  );

  useEffect(() => {
    if (complete || !checkoutConfigured) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/ticket-wizard/status");
        const data = await res.json();
        if (data.purchaseComplete) {
          setComplete(true);
          setTicketName(data.purchasedTicketName ?? null);
          setCheckoutOpen(false);
        }
      } catch {
        // transient failure - try again next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [complete, checkoutConfigured]);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  useEffect(() => {
    if (!checkoutOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCheckout();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [checkoutOpen, closeCheckout]);

  if (complete) {
    return (
      <div className="wizard-intro-card">
        <p>
          {ticketName
            ? t("purchase-already-complete-named", { ticket: ticketName })
            : t("purchase-already-complete")}
        </p>
        <Link href="/scavenger" className="cta-btn wizard-intro-cta">
          {t("purchase-go-to-dashboard")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <TicketsSection
        tickets={tickets}
        widgetConfig={widgetConfig}
        purchasedTicketName={ticketName}
        onBuy={() => setCheckoutOpen(true)}
      />

      {checkoutOpen && (
        <div
          className="wizard-checkout-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t("purchase-heading")}
          onClick={closeCheckout}
        >
          <div className="wizard-checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="wizard-checkout-modal-bar">
              <span>{t("purchase-heading")}</span>
              <button
                type="button"
                className="wizard-checkout-close"
                onClick={closeCheckout}
                aria-label={t("purchase-close-checkout")}
              >
                ×
              </button>
            </div>
            {/*
              Rendered as a plain iframe rather than via Ticket Tailor's
              widget.js: that script swaps itself for an iframe-resizer frame
              with scrolling="no" and relies on a cross-origin height
              handshake. When the handshake doesn't land the frame stays at
              its initial size with scrolling disabled - which is exactly the
              "cut off and non-interactive" state. Owning the iframe lets us
              size it and keep it scrollable ourselves.
            */}
            <iframe
              className="wizard-checkout-frame"
              src={widgetConfig.checkoutEmbedUrl ?? undefined}
              title={t("purchase-heading")}
              scrolling="yes"
              allow="payment *"
            />
            <p className="wizard-purchase-status">{t("purchase-waiting-confirmation")}</p>
            {/*
              Escape hatch for when the browser blocks the embedded
              checkout's third-party cookies (always the case until a custom
              domain sharing this site's registrable domain is connected, and
              always on localhost). Ticket Tailor itself falls back to a new
              tab in that state; this makes that path deliberate rather than
              a dead end. Status polling keeps running while this modal is
              open, so completing the purchase in the new tab still advances
              the wizard here automatically.
            */}
            <p className="wizard-checkout-newtab">
              <a
                href={widgetConfig.eventUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("purchase-open-new-tab")}
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
