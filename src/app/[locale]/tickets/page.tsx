import { getTranslations, getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import { getWizardStatus } from "@/lib/ticketWizard";
import { redirect, Link } from "@/i18n/navigation";

export default async function TicketsPage() {
  const t = await getTranslations("TicketWizard");
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
        <div className="wizard-intro-card">
          <ol className="wizard-intro-steps">
            <li>{t("intro-step-register")}</li>
            <li>{t("intro-step-demographics")}</li>
            <li>{t("intro-step-avatar")}</li>
            <li>{t("intro-step-purchase")}</li>
          </ol>
          <a
            href="/auth/login?screen_hint=signup&returnTo=/tickets/demographics"
            className="cta-btn wizard-intro-cta"
          >
            {t("intro-cta-signup")}
          </a>
        </div>
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
