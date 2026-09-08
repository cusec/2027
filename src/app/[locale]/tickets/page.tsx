import { getTranslations, getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import { getWizardStatus } from "@/lib/ticketWizard";
import { redirect, Link } from "@/i18n/navigation";

/**
 * One card per step, in order. Each carries a title plus a single line on what
 * the step actually asks for, so the page answers "what am I in for" without
 * the reader opening anything.
 */
const INTRO_STEPS = ["register", "demographics", "avatar", "purchase"] as const;

export default async function TicketsPage() {
  const t = await getTranslations("TicketWizard");
  const tp = await getTranslations("TicketsPage");
  const locale = await getLocale();
  const session = await auth0.getSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="tickets-wrapper">
        <div className="tickets-header">
          <h1 className="tickets-heading">{t("intro-heading")}</h1>
          <p className="tickets-subheading">{t("intro-subheading")}</p>
        </div>
        <ol className="wizard-steps">
          {INTRO_STEPS.map((step, i) => (
            <li key={step} className="wizard-step-card">
              <div className="wizard-step-card__head">
                <span className="wizard-step-card__num" aria-hidden="true">
                  {i + 1}
                </span>
                <h2 className="wizard-step-card__title">
                  {t(`intro-step-${step}`)}
                </h2>
              </div>
              <p className="wizard-step-card__note">
                {t(`intro-step-${step}-note`)}
              </p>
            </li>
          ))}
        </ol>

        <a
          href="/auth/login?screen_hint=signup&returnTo=/tickets/demographics"
          className="cta-btn wizard-steps__cta"
        >
          {t("intro-cta-signup")}
        </a>

        <ul className="wizard-facts">
          <li>
            <span>{tp("fact-when-label")}</span>
            <b>{tp("fact-when")}</b>
          </li>
          <li>
            <span>{tp("fact-where-label")}</span>
            <b>{tp("fact-where")}</b>
          </li>
          <li>
            <span>{tp("fact-edition-label")}</span>
            <b>{tp("fact-edition")}</b>
          </li>
        </ul>
      </div>
    );
  }

  // Auth0 account now exists -> "Account Registration" step is complete.
  await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
  });

  const status = await getWizardStatus(email);

  if (!status.demographicsComplete) {
    redirect({ href: "/tickets/demographics", locale });
  }
  if (!status.avatarComplete) {
    redirect({ href: "/tickets/avatar", locale });
  }
  if (!status.purchaseComplete) {
    redirect({ href: "/tickets/purchase", locale });
  }

  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("intro-complete-heading")}</h1>
        <p className="tickets-subheading">{t("intro-complete-subheading")}</p>
      </div>
      <div className="wizard-intro-card">
        <Link href="/scavenger" className="cta-btn wizard-intro-cta">
          {t("intro-complete-cta")}
        </Link>
      </div>
    </div>
  );
}
