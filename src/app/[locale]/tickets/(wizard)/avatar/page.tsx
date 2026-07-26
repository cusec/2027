import { getTranslations, getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { redirect } from "@/i18n/navigation";
import { getWizardStatus } from "@/lib/ticketWizard";
import AvatarStepClient from "@/app/components/TicketWizard/AvatarStepClient";

export default async function AvatarPage() {
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
          <a href="/auth/login?returnTo=/tickets/avatar" className="cta-btn wizard-intro-cta">
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

  return <AvatarStepClient />;
}
