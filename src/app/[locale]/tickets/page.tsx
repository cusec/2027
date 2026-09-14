import { getTranslations, getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import { getBaseUrl } from "@/lib/siteUrl";
import { redirect } from "@/i18n/navigation";
import type { DemographicInfo as SavedProfile } from "@/lib/interface";
import TicketConfirmation from "@/app/components/TicketWizard/TicketConfirmation";
import { answersFrom } from "@/app/components/TicketWizard/profileAnswers";

/**
 * One card per step, in order. Each carries a title plus a single line on what
 * the step actually asks for, so the page answers "what am I in for" without
 * the reader opening anything.
 */
const INTRO_STEPS = ["account", "profile", "interests", "ticket"] as const;

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

        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/auth/login?screen_hint=signup&returnTo=/tickets/profile"
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

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
  });

  const status = await getWizardStatus(email);
  if (!status.profileComplete) {
    redirect({ href: "/tickets/profile", locale });
  }
  if (!status.interestsComplete) {
    redirect({ href: "/tickets/interests", locale });
  }
  if (!status.purchaseComplete) {
    redirect({ href: "/tickets/purchase", locale });
  }

  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: user._id }).lean();
  const saved = doc ? (JSON.parse(JSON.stringify(doc)) as SavedProfile) : null;
  const profile = answersFrom(saved);
  const accountName =
    `${profile.firstName} ${profile.lastName}`.trim() || session?.user?.name || email;

  return (
    <div className="tickets-wrapper">
      <TicketConfirmation
        ticketName={status.purchasedTicketName}
        accountName={accountName}
        accountEmail={email}
        huntOpen={process.env.SCAVENGER_HUNT_ENABLED === "true"}
        baseURL={await getBaseUrl()}
      />
    </div>
  );
}
