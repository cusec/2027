import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAttendeeSession } from "@/lib/attendeeSession";
import type { DemographicInfo as SavedProfile } from "@/lib/interface";
import ProfileForm from "@/app/components/TicketWizard/ProfileForm";
import PostHogIdentify from "@/app/components/Analytics/PostHogIdentify";

import SignInCard from "@/app/components/TicketWizard/SignInCard";
import { answersFrom } from "@/app/components/TicketWizard/profileAnswers";

export default async function ProfilePage() {
  const session = await getAttendeeSession();
  const email = session?.user?.email;
  if (!email) return <SignInCard returnTo="/tickets/profile" />;

  const [{ findOrCreateUser, ensureAnalyticsId }, { default: connectMongoDB }, { DemographicInfo }, { getWizardStatus }] =
    await Promise.all([
      import("@/lib/userService"),
      import("@/lib/mongodb"),
      import("@/lib/models"),
      import("@/lib/ticketWizard"),
    ]);

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
    entryPoint: "tickets",
  });

  const status = await getWizardStatus(email);
  if (status.purchaseComplete) redirect({ href: "/profile", locale: await getLocale() });

  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: user._id }).lean();
  const saved = doc ? (JSON.parse(JSON.stringify(doc)) as SavedProfile) : null;

  const profile = session.user as { given_name?: string; family_name?: string; name?: string };
  const [first, ...rest] = (profile.name ?? "").trim().split(/\s+/);
  const initial = answersFrom(saved);
  initial.firstName ||= profile.given_name || first || "";
  initial.lastName ||= profile.family_name || rest.join(" ");
  initial.primaryEmail ||= email;

  const startIndex = saved?.sections?.basics && !saved.sections.background ? 1 : 0;

  return (
    <div className="tickets-wrapper">
      <PostHogIdentify analyticsId={await ensureAnalyticsId(user)} />
      <ProfileForm initial={initial} startIndex={startIndex} />
    </div>
  );
}
