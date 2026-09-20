"use client";

import { useLocale, useTranslations } from "next-intl";
import type { TicketType } from "@/lib/ticketTailor";
import VipChip from "./VipChip";

const PERKS = 4;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

interface TicketCardProps {
  ticket: TicketType;
  vip: TicketType | null;
  checkoutConfigured: boolean;
  purchased?: boolean;
  onBuy?: (ticket: TicketType) => void;
}

export default function TicketCard({
  ticket,
  vip,
  checkoutConfigured,
  purchased = false,
  onBuy,
}: TicketCardProps) {
  const t = useTranslations("TicketsPage");
  const passes = useTranslations("V2.passes");
  const locale = useLocale();

  const list = (prefix: string) =>
    Array.from({ length: PERKS }, (_, i) => passes(`${prefix}-${i + 1}`));

  const vipExtra = vip ? vip.priceCents - ticket.priceCents : 0;
  const vipPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(vipExtra / 100);

  let buttonLabel = t("buy-button");
  let disabled = false;

  if (purchased) {
    buttonLabel = t("purchased");
    disabled = true;
  } else if (ticket.status === "sold_out") {
    buttonLabel = t("sold-out");
    disabled = true;
  } else if (ticket.status === "unavailable") {
    buttonLabel = t("unavailable");
    disabled = true;
  } else if (!checkoutConfigured) {
    buttonLabel = t("checkout-not-configured");
    disabled = true;
  }

  return (
    <div className={`ticket-card${purchased ? " ticket-card--purchased" : ""}`}>
      <h2 className="ticket-card-name">{ticket.name}</h2>
      <div className="ticket-card-price-row">
        <p className="ticket-card-price">{formatPrice(ticket.priceCents)}</p>
        {vip && vipExtra > 0 && (
          <VipChip
            label={t("vip-chip", { price: vipPrice })}
            heading={passes("vip-heading")}
            perks={list("vip-perk")}
          />
        )}
      </div>
      <ul className="ticket-card-features">
        {list("perk").map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
      <button
        type="button"
        className="cta-btn ticket-card-buy"
        disabled={disabled}
        onClick={() => onBuy?.(ticket)}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
