import { getTranslations } from "next-intl/server";

/** What every wizard step shows to a visitor without a session. */
export default async function SignInCard({ returnTo }: { returnTo: string }) {
  const t = await getTranslations("TicketWizard");
  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("signin-heading")}</h1>
      </div>
      <div className="wizard-intro-card">
        {/* Auth0 owns /auth/*, so this has to be a full document request. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="cta-btn wizard-intro-cta"
        >
          {t("signin-cta")}
        </a>
      </div>
    </div>
  );
}
