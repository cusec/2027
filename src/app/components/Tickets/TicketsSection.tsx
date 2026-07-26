"use client";

import TicketCard from "./TicketCard";
import type { TicketType, TicketWidgetConfig } from "@/lib/ticketTailor";

interface TicketsSectionProps {
  tickets: TicketType[];
  widgetConfig: TicketWidgetConfig;
  purchasedTicketName?: string | null;
  onBuy?: () => void;
}

export default function TicketsSection({
  tickets,
  widgetConfig,
  purchasedTicketName = null,
  onBuy,
}: TicketsSectionProps) {
  const checkoutConfigured = Boolean(widgetConfig.boxOfficeName && widgetConfig.eventUrl);

  return (
    <div className="tickets-grid">
      {tickets.map(ticket => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          isVip={ticket.name.toLowerCase().includes("vip")}
          checkoutConfigured={checkoutConfigured}
          purchased={
            !!purchasedTicketName &&
            purchasedTicketName.toLowerCase().includes(ticket.name.toLowerCase())
          }
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}
