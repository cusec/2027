import { getLocale } from "next-intl/server";
import { auth0 } from "@/lib/auth0";
import { redirect } from "@/i18n/navigation";
import { findOrCreateUser } from "@/lib/userService";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import { getBaseUrl } from "@/lib/siteUrl";
import type { DemographicInfo as SavedProfile } from "@/lib/interface";
import InterestsForm from "@/app/components/TicketWizard/InterestsForm";
import AlreadyTicketedModal from "@/app/components/TicketWizard/AlreadyTicketedModal";
import SignInCard from "@/app/components/TicketWizard/SignInCard";
import { answersFrom } from "@/app/components/TicketWizard/profileAnswers";

export default async function InterestsPage() {
  const locale = await getLocale();
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) return <SignInCard returnTo="/tickets/interests" />;

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
  });

  const status = await getWizardStatus(email);
  if (status.purchaseComplete) {
    return (
      <AlreadyTicketedModal
        email={email}
        ticketName={status.purchasedTicketName}
        baseURL={await getBaseUrl()}
      />
    );
  }
  if (!status.profileComplete) {
    redirect({ href: "/tickets/profile", locale });
  }

  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: user._id }).lean();
  const saved = doc ? (JSON.parse(JSON.stringify(doc)) as SavedProfile) : null;

  // Resume on the second section when only the first is saved.
  const startIndex = saved?.sections?.goals && !saved.sections.experience ? 1 : 0;

  return (
    <div className="tickets-wrapper">
      <InterestsForm initial={answersFrom(saved)} startIndex={startIndex} />
    </div>
  );
}
