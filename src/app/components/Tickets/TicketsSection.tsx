"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import TicketCard, { type Audience } from "./TicketCard";
import type { TicketType, TicketWidgetConfig } from "@/lib/ticketTailor";

const AUDIENCES: Audience[] = ["student", "professional"];

const audienceOf = (name: string): Audience =>
  /professional|professionnel/i.test(name) ? "professional" : "student";

const isVip = (name: string) => /\bvip\b/i.test(name);

interface TicketsSectionProps {
  tickets: TicketType[];
  widgetConfig: TicketWidgetConfig;
  purchasedTicketName?: string | null;
  onBuy?: (ticket: TicketType) => void;
}

export default function TicketsSection({
  tickets,
  widgetConfig,
  purchasedTicketName = null,
  onBuy,
}: TicketsSectionProps) {
  const t = useTranslations("V2.passes");
  const checkoutConfigured = Boolean(widgetConfig.boxOfficeName && widgetConfig.eventUrl);

  const groups = useMemo(
    () =>
      AUDIENCES.flatMap((audience) => {
        const mine = tickets.filter((ticket) => audienceOf(ticket.name) === audience);
        const base = mine.find((ticket) => !isVip(ticket.name));
        const vip = mine.find((ticket) => isVip(ticket.name)) ?? null;
        if (base) return [{ audience, base, vip }];
        return vip ? [{ audience, base: vip, vip: null }] : [];
      }),
    [tickets]
  );

  const [audience, setAudience] = useState<Audience>(groups[0]?.audience ?? "student");
  const group = groups.find((g) => g.audience === audience) ?? groups[0];
  if (!group) return null;

  const owns = (ticket: TicketType | null) =>
    !!ticket &&
    !!purchasedTicketName &&
    purchasedTicketName.toLowerCase().includes(ticket.name.toLowerCase());

  return (
    <div className="tickets-section">
      {groups.length > 1 && (
        <div className="ticket-toggle" role="group" aria-label={t("toggle-label")}>
          {groups.map((g) => (
            <button
              key={g.audience}
              type="button"
              className={`ticket-toggle__option${g.audience === group.audience ? " is-on" : ""}`}
              aria-pressed={g.audience === group.audience}
              onClick={() => setAudience(g.audience)}
            >
              {t(`toggle-${g.audience}`)}
            </button>
          ))}
        </div>
      )}

      <div className="v2-passes__grid">
        <TicketCard
          key={group.base.id}
          ticket={group.base}
          vip={group.vip}
          audience={group.audience}
          checkoutConfigured={checkoutConfigured}
          purchased={owns(group.base) || owns(group.vip)}
          onBuy={onBuy}
        />
      </div>
    </div>
  );
}
