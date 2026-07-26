import { getTranslations } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo } from "@/lib/models";
import DemographicsForm from "@/app/components/TicketWizard/DemographicsForm";

export default async function DemographicsPage() {
  const t = await getTranslations("TicketWizard");
  const session = await auth0.getSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="tickets-wrapper">
        <div className="tickets-header">
          <h1 className="tickets-heading">{t("signin-heading")}</h1>
        </div>
        <div className="wizard-intro-card">
          <a
            href="/auth/login?screen_hint=signup&returnTo=/tickets/demographics"
            className="cta-btn wizard-intro-cta"
          >
            {t("signin-cta")}
          </a>
        </div>
      </div>
    );
  }

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
  });

  await connectMongoDB();
  const existing = await DemographicInfo.findOne({ user: user._id }).lean();

  return (
    <div className="tickets-wrapper">
      <div className="tickets-header">
        <h1 className="tickets-heading">{t("demographics-heading")}</h1>
        <p className="wizard-confidential-notice">{t("confidential-notice")}</p>
      </div>
      <DemographicsForm
        initialData={existing ? JSON.parse(JSON.stringify(existing)) : null}
      />
    </div>
  );
}
