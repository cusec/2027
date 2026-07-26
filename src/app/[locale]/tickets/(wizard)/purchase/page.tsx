import { getTranslations, getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { redirect } from "@/i18n/navigation";
import { getWizardStatus } from "@/lib/ticketWizard";
import { getTicketTypes, getTicketWidgetConfig } from "@/lib/ticketTailor";
import PurchaseStepClient from "@/app/components/TicketWizard/PurchaseStepClient";

export default async function PurchasePage() {
  const t = await getTranslations("TicketWizard");
  const locale = await getLocale();
  const session = await auth0.getSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="tickets-wrapper">
        <div className="tickets-header">
          <h1 className="tickets-heading">{t("signin-heading")}</h1>
        </div>
        <div className="wizard-intro-card">
          <a href="/auth/login?returnTo=/tickets/purchase" className="cta-btn wizard-intro-cta">
            {t("signin-cta")}
          </a>
        </div>
      </div>
    );
  }

  const status = await getWizardStatus(email);
  if (!status.demographicsComplete) {
    redirect({ href: "/tickets/demographics", locale });
  }
  if (!status.avatarComplete) {
    redirect({ href: "/tickets/avatar", locale });
  }

  const { tickets, source } = await getTicketTypes();
  const widgetConfig = getTicketWidgetConfig();

  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("purchase-heading")}</h1>
        <p className="tickets-subheading">{t("purchase-subheading")}</p>
        {source === "mock" && <p className="tickets-mock-banner">{t("mock-banner")}</p>}
        {source === "error" && <p className="tickets-error-banner">{t("error-banner")}</p>}
      </div>
      <PurchaseStepClient
        tickets={tickets}
        widgetConfig={widgetConfig}
        alreadyComplete={status.purchaseComplete}
      />
    </div>
  );
}
