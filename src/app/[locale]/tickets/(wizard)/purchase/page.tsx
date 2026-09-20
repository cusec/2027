import { getTranslations, getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { redirect } from "@/i18n/navigation";
import { findOrCreateUser, ensureAnalyticsId } from "@/lib/userService";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import { reconcileTicketPurchase } from "@/lib/ticketLinking";
import { getBaseUrl } from "@/lib/siteUrl";
import { getTicketTypes, getTicketWidgetConfig } from "@/lib/ticketTailor";
import type { DemographicInfo as SavedProfile } from "@/lib/interface";
import PurchaseStepClient from "@/app/components/TicketWizard/PurchaseStepClient";
import PostHogIdentify from "@/app/components/Analytics/PostHogIdentify";
import SignInCard from "@/app/components/TicketWizard/SignInCard";
import { answersFrom } from "@/app/components/TicketWizard/profileAnswers";

export default async function PurchasePage() {
  const t = await getTranslations("TicketWizard");
  const locale = await getLocale();
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) return <SignInCard returnTo="/tickets/purchase" />;

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
    entryPoint: "tickets",
  });

  let status = await getWizardStatus(email);
  if (!status.purchaseComplete) {
    const reconciled = await reconcileTicketPurchase(email, session?.user?.name || "Attendee");
    if (reconciled.linked) status = await getWizardStatus(email);
  }
  if (!status.purchaseComplete) {
    if (!status.profileComplete) {
      redirect({ href: "/tickets/profile", locale });
    }
    if (!status.interestsComplete) {
      redirect({ href: "/tickets/interests", locale });
    }
  }

  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: user._id }).lean();
  const saved = doc ? (JSON.parse(JSON.stringify(doc)) as SavedProfile) : null;
  const profile = answersFrom(saved);
  const accountName =
    `${profile.firstName} ${profile.lastName}`.trim() || session?.user?.name || email;

  const { tickets, source } = await getTicketTypes();

  // Pre-filling checkout with the account's own email is what keeps the
  // purchase auto-linkable: every automatic path matches an order to an
  // account by that address. Names come from the profile the delegate just
  // filled in, falling back to the account.
  const widgetConfig = await getTicketWidgetConfig({
    email,
    firstName: profile.firstName || null,
    lastName: profile.lastName || null,
  });

  const huntOpen = process.env.SCAVENGER_HUNT_ENABLED === "true";

  return (
    <div className="tickets-wrapper">
      <PostHogIdentify analyticsId={await ensureAnalyticsId(user)} />
      {!status.purchaseComplete && (
        <div className="tickets-header">
          <h1 className="tickets-heading">{t("purchase-heading")}</h1>
          {source === "mock" && <p className="tickets-mock-banner">{t("mock-banner")}</p>}
          {source === "error" && <p className="tickets-error-banner">{t("error-banner")}</p>}
        </div>
      )}
      <PurchaseStepClient
        tickets={tickets}
        widgetConfig={widgetConfig}
        alreadyComplete={status.purchaseComplete}
        purchasedTicketName={status.purchasedTicketName}
        accountEmail={email}
        accountName={accountName}
        huntOpen={huntOpen}
        baseURL={await getBaseUrl()}
      />
    </div>
  );
}
