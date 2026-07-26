"use client";

import { useState } from "react";
import Script from "next/script";
import TicketCard from "./TicketCard";
import type { TicketType, TicketWidgetConfig } from "@/lib/ticketTailor";

interface TicketsSectionProps {
  tickets: TicketType[];
  widgetConfig: TicketWidgetConfig;
  onBuyClicked?: () => void;
}

export default function TicketsSection({ tickets, widgetConfig, onBuyClicked }: TicketsSectionProps) {
  const [scriptReady, setScriptReady] = useState(false);

  const checkoutConfigured = Boolean(widgetConfig.boxOfficeName && widgetConfig.eventId);

  function handleBuy() {
    if (!checkoutConfigured || !window.TTWidget) return;
    window.TTWidget.loadEvent(
      widgetConfig.boxOfficeName!,
      widgetConfig.eventId!,
      "tt-wgt-popup",
      widgetConfig.customDomain ?? undefined
    );
    onBuyClicked?.();
  }

  return (
    <>
      {checkoutConfigured && (
        <Script
          src="https://cdn.tickettailor.com/js/TTWidget.js"
          strategy="lazyOnload"
          onLoad={() => setScriptReady(true)}
        />
      )}
      <div className="tickets-grid">
        {tickets.map(ticket => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            isVip={ticket.name.toLowerCase().includes("vip")}
            checkoutConfigured={checkoutConfigured}
            checkoutReady={checkoutConfigured && scriptReady}
            onBuy={handleBuy}
          />
        ))}
      </div>
    </>
  );
}
