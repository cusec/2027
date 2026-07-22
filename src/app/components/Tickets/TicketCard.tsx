"use client";

import { useTranslations } from "next-intl";
import type { TicketType } from "@/lib/ticketTailor";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

interface TicketCardProps {
  ticket: TicketType;
  isVip: boolean;
  checkoutConfigured: boolean;
  checkoutReady: boolean;
  onBuy: () => void;
}

export default function TicketCard({
  ticket,
  isVip,
  checkoutConfigured,
  checkoutReady,
  onBuy,
}: TicketCardProps) {
  const t = useTranslations("TicketsPage");

  const features = isVip
    ? [t("vip-feature-1"), t("vip-feature-2"), t("vip-feature-3")]
    : [t("general-feature-1"), t("general-feature-2"), t("general-feature-3")];

  let buttonLabel = t("buy-button");
  let disabled = false;

  if (ticket.status === "sold_out") {
    buttonLabel = t("sold-out");
    disabled = true;
  } else if (ticket.status === "unavailable") {
    buttonLabel = t("unavailable");
    disabled = true;
  } else if (!checkoutConfigured) {
    buttonLabel = t("checkout-not-configured");
    disabled = true;
  } else if (!checkoutReady) {
    buttonLabel = t("loading-checkout");
    disabled = true;
  }

  return (
    <div className={`ticket-card${isVip ? " ticket-card--vip" : ""}`}>
      {isVip && <span className="ticket-card-badge">{t("vip-badge")}</span>}
      <h2 className="ticket-card-name">{ticket.name}</h2>
      <p className="ticket-card-price">{formatPrice(ticket.priceCents)}</p>
      <ul className="ticket-card-features">
        {features.map(feature => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button
        type="button"
        className="cta-btn ticket-card-buy"
        disabled={disabled}
        onClick={onBuy}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
