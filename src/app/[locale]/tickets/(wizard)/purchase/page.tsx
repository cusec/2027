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

  // Pre-filling checkout with the account's own email is what keeps the
  // purchase auto-linkable: every automatic path matches an order to an
  // account by that address. Ticket Tailor only honours pre-fill on a custom
  // domain, which is now configured. Names are a convenience only.
  const profile = session?.user as { given_name?: string; family_name?: string } | undefined;
  const [fallbackFirst, ...fallbackRest] = (session?.user?.name ?? "").trim().split(/\s+/);
  const widgetConfig = await getTicketWidgetConfig({
    email,
    firstName: profile?.given_name || fallbackFirst || null,
    lastName: profile?.family_name || fallbackRest.join(" ") || null,
  });

  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("purchase-heading")}</h1>
        <p className="tickets-subheading">{t("purchase-subheading")}</p>
        <p className="wizard-purchase-note">
          {t("purchase-one-per-person", { email: email })}
        </p>
        {source === "mock" && <p className="tickets-mock-banner">{t("mock-banner")}</p>}
        {source === "error" && <p className="tickets-error-banner">{t("error-banner")}</p>}
      </div>
      <PurchaseStepClient
        tickets={tickets}
        widgetConfig={widgetConfig}
        alreadyComplete={status.purchaseComplete}
        purchasedTicketName={status.purchasedTicketName}
        accountEmail={email}
      />
    </div>
  );
}
