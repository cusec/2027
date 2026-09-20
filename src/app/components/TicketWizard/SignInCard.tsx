import { getTranslations } from "next-intl/server";
import { analyticsAttributes } from "@/lib/analytics/events";

export default async function SignInCard({ returnTo }: { returnTo: string }) {
  const t = await getTranslations("TicketWizard");
  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("signin-heading")}</h1>
      </div>
      <div className="wizard-intro-card">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="cta-btn wizard-intro-cta"
          {...analyticsAttributes("login_started", {
            location: "sign_in_card",
            return_to: returnTo,
          })}
        >
          {t("signin-cta")}
        </a>
      </div>
    </div>
  );
}
