import { getTranslations } from "next-intl/server";
import { getTicketTypes, getTicketWidgetConfig } from "@/lib/ticketTailor";
import TicketsSection from "@/app/components/Tickets/TicketsSection";

export default async function TicketsPage() {
  const t = await getTranslations("TicketsPage");
  const { tickets, source } = await getTicketTypes();
  const widgetConfig = getTicketWidgetConfig();

  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("heading")}</h1>
        <p className="tickets-subheading">{t("subheading")}</p>
        {source === "mock" && <p className="tickets-mock-banner">{t("mock-banner")}</p>}
        {source === "error" && <p className="tickets-error-banner">{t("error-banner")}</p>}
      </div>
      <TicketsSection tickets={tickets} widgetConfig={widgetConfig} />
    </div>
  );
}
