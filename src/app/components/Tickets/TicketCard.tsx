"use client";

import { useLocale, useTranslations } from "next-intl";
import type { TicketType } from "@/lib/ticketTailor";
import VipChip from "./VipChip";

const PERKS = 4;

export type Audience = "student" | "professional";

interface TicketCardProps {
  ticket: TicketType;
  vip: TicketType | null;
  audience: Audience;
  checkoutConfigured: boolean;
  purchased?: boolean;
  onBuy?: () => void;
}

/**
 * The purchase step's ticket card. It is the landing page's pass card
 * (`V2Passes`) rendered from live Ticket Tailor data: the same `.v2-pass`
 * markup and classes, so the two stay 1:1 - restyle `.v2-pass` in passes.css,
 * not this component.
 *
 * The VIP chip always shows, as it does on the landing page. When the VIP
 * ticket type is visible in Ticket Tailor its real price difference is used;
 * while it is hidden there, the chip falls back to the landing page's copy.
 */
export default function TicketCard({
  ticket,
  vip,
  audience,
  checkoutConfigured,
  purchased = false,
  onBuy,
}: TicketCardProps) {
  const t = useTranslations("TicketsPage");
  const passes = useTranslations("V2.passes");
  const locale = useLocale();

  const list = (prefix: string) =>
    Array.from({ length: PERKS }, (_, i) => passes(`${prefix}-${i + 1}`));

  const money = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "CAD",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

  const vipExtra = vip ? vip.priceCents - ticket.priceCents : 0;
  const vipLabel =
    vipExtra > 0 ? t("vip-chip", { price: money(vipExtra) }) : passes("vip-chip");

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
    <article className={`v2-pass${purchased ? " is-purchased" : ""}`}>
      <h2 className="v2-pass__name v2-pixel">{ticket.name}</h2>

      <div className="v2-pass__price">
        <span className="v2-pass__amount v2-pixel">{money(ticket.priceCents)}</span>
        <span className="v2-pass__unit">{passes(`${audience}-unit`)}</span>
        <VipChip
          className="v2-pass__vip"
          label={vipLabel}
          heading={passes("vip-heading")}
          perks={list("vip-perk")}
        />
      </div>

      <ul className="v2-pass__perks">
        {list("perk").map((perk) => (
          <li key={perk}>
            <i aria-hidden="true" />
            {perk}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="v2-btn v2-btn--primary v2-pass__cta"
        disabled={disabled}
        onClick={onBuy}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
