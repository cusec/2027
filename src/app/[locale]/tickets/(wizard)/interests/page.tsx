import { getLocale } from "next-intl/server";
import { getAttendeeSession } from "@/lib/attendeeSession";
import { redirect } from "@/i18n/navigation";
import { findOrCreateUser, ensureAnalyticsId } from "@/lib/userService";
import connectMongoDB from "@/lib/mongodb";
import { DemographicInfo } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import type { DemographicInfo as SavedProfile } from "@/lib/interface";
// INTEREST_SECTIONS comes from the plain options module on purpose: importing
// a value from InterestsForm (a "use client" file) hands a server component a
// client reference instead of the array, so .findIndex is not a function.
import { INTEREST_SECTIONS } from "@/lib/ticketWizardOptions";
import InterestsForm from "@/app/components/TicketWizard/InterestsForm";
import PostHogIdentify from "@/app/components/Analytics/PostHogIdentify";

import SignInCard from "@/app/components/TicketWizard/SignInCard";
import { answersFrom } from "@/app/components/TicketWizard/profileAnswers";

export default async function InterestsPage() {
  const session = await getAttendeeSession();
  const email = session?.user?.email;
  if (!email) return <SignInCard returnTo="/tickets/interests" />;

  const user = await findOrCreateUser({
    email,
    name: session?.user?.name || "Attendee",
    entryPoint: "tickets",
  });

  const status = await getWizardStatus(email);
  if (status.purchaseComplete) redirect({ href: "/profile", locale: await getLocale() });

  await connectMongoDB();
  const doc = await DemographicInfo.findOne({ user: user._id }).select("-resumePublicId").lean();
  const saved = doc ? (JSON.parse(JSON.stringify(doc)) as SavedProfile) : null;

  const firstUnsaved = INTEREST_SECTIONS.findIndex((id) => !saved?.sections?.[id]);
  const startIndex = firstUnsaved === -1 ? 0 : firstUnsaved;

  const resume = saved?.resumeFileName
    ? {
        fileName: saved.resumeFileName,
        size: saved.resumeSize ?? 0,
        uploadedAt: saved.resumeUploadedAt ?? null,
      }
    : null;

  return (
    <div className="tickets-wrapper">
      <PostHogIdentify analyticsId={await ensureAnalyticsId(user)} />
      <InterestsForm initial={answersFrom(saved)} startIndex={startIndex} initialResume={resume} />
    </div>
  );
}
