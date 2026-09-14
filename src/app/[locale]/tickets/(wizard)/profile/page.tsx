import { auth0 } from "@/lib/auth0";
import { findOrCreateUser } from "@/lib/userService";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import { getBaseUrl } from "@/lib/siteUrl";
import type { DemographicInfo as SavedProfile } from "@/lib/interface";
import ProfileForm from "@/app/components/TicketWizard/ProfileForm";
import AlreadyTicketedModal from "@/app/components/TicketWizard/AlreadyTicketedModal";
import SignInCard from "@/app/components/TicketWizard/SignInCard";
import { answersFrom } from "@/app/components/TicketWizard/profileAnswers";

export default async function ProfilePage() {
  const session = await auth0.getSession();
  const email = session?.user?.email;
  if (!email) return <SignInCard returnTo="/tickets/profile" />;

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
  });

  // One ticket per account: a ticketed account re-opening the profile would
  // look like a second purchase in progress.
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

  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: user._id }).lean();
  const saved = doc ? (JSON.parse(JSON.stringify(doc)) as SavedProfile) : null;

  // Names and email start from the account, so most delegates only confirm.
  const profile = session.user as { given_name?: string; family_name?: string; name?: string };
  const [first, ...rest] = (profile.name ?? "").trim().split(/\s+/);
  const initial = answersFrom(saved);
  initial.firstName ||= profile.given_name || first || "";
  initial.lastName ||= profile.family_name || rest.join(" ");
  initial.primaryEmail ||= email;

  // Resume on Background when Basics is already saved.
  const startIndex = saved?.sections?.basics && !saved.sections.background ? 1 : 0;

  return (
    <div className="tickets-wrapper">
      <ProfileForm initial={initial} startIndex={startIndex} />
    </div>
  );
}
