import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAttendeeSession } from "@/lib/attendeeSession";
import { findOrCreateUser } from "@/lib/userService";
import { getWizardStatus } from "@/lib/ticketWizard";
import { ensureTicketGraphicNumber, toTicketRomanNumeral } from "@/lib/ticketGraphicNumber";
import { reconcileTicketPurchase } from "@/lib/ticketLinking";
import { DemographicInfo, HuntItem, User } from "@/lib/models";

import { getBaseUrl } from "@/lib/siteUrl";
import { INSTITUTIONS } from "@/lib/institutions";
import { FIELD_OF_STUDY_OPTIONS, optionLabel } from "@/lib/ticketWizardOptions";
import { AVATAR_POSES, getProfileEntitlements, type ProfileData } from "@/lib/profileSettings";
import type { Auth0User, DbUser, DemographicInfo as SavedProfile } from "@/lib/interface";
import AeroDock from "@/components/scavenger/AeroDock";
import AttendeeProfile from "@/app/components/Profile/AttendeeProfile";
import SignInCard from "@/app/components/TicketWizard/SignInCard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AttendeeProfile");
  return { title: t("heading"), robots: { index: false, follow: false } };
}

export default async function ProfilePage() {
  const locale = await getLocale();
  const t = await getTranslations("AttendeeProfile");
  const session = await getAttendeeSession();
  const email = session?.user?.email;
  if (!email) return <main className="v2 v2-profile-signin"><SignInCard returnTo="/profile" /></main>;
  let status = await getWizardStatus(email);
  if (!status.purchaseComplete) {
    const result = await reconcileTicketPurchase(email, session.user.name || "Attendee");
    if (result.linked) status = await getWizardStatus(email);
  }
  if (!status.purchaseComplete) redirect({ href: "/tickets", locale });
  const user = await findOrCreateUser({ email, name: session.user.name, entryPoint: "tickets" });
  const ticketGraphicNumber = await ensureTicketGraphicNumber(String(user._id));
  const saved = await DemographicInfo.findOne({ user: user._id }).lean<SavedProfile & { resumeRoast?: boolean }>();
  const d = saved ?? {} as Partial<SavedProfile> & { resumeRoast?: boolean };
  const roles: string[] = session.user["cusec/roles"] ?? [];
  const huntOpen = process.env.SCAVENGER_HUNT_ENABLED === "true";
  let found = 0, total = 0, points = 0, rank: number | null = null;
  if (huntOpen) {
    const items = await HuntItem.find({}).select("_id points").lean();
    const scores = new Map(items.map(item => [String(item._id), Number(item.points || 0)]));
    const claimed: string[] = (user.claimedItems ?? []).map(String);
    found = claimed.filter(id => scores.has(id)).length;
    total = items.length;
    points = claimed.reduce((sum, id) => sum + (scores.get(id) ?? 0), 0);
    if (points > 0) {
      const peers = await User.find({ active: true }).select("claimedItems").lean();
      rank = 1 + peers.filter(peer => (peer.claimedItems ?? []).reduce((sum: number, id: unknown) => sum + (scores.get(String(id)) ?? 0), 0) > points).length;
    }
  }
  const study = FIELD_OF_STUDY_OPTIONS.find(o => o.value === d.fieldOfStudy);
  const entitlements = getProfileEntitlements(roles);
  entitlements.isVip = user.vip?.status === "active";
  const data: ProfileData = {
    ...entitlements,
    name: `${d.firstName || ""} ${d.lastName || ""}`.trim() || user.name || t("attendee"), email,
    firstName: d.firstName || "", lastName: d.lastName || "", pronoun: d.pronoun || "",
    role: roles.includes("Admin") ? t("admin") : roles.includes("Volunteer") ? t("volunteer") : t("delegate"),
    school: INSTITUTIONS.find(s => s.value === d.school)?.name || d.schoolOther || d.school || t("school-empty"),
    fieldOfStudy: study && study.value !== "other" ? optionLabel(study, locale) : d.fieldOfStudyOther || "",
    graduation: d.expectedGraduation || "",
    avatarPose: AVATAR_POSES.includes(user.avatarPose) ? user.avatarPose : "default",
    ticketName: status.purchasedTicketName || t("conference-pass"),
    ticketRomanNumeral: ticketGraphicNumber === null ? null : toTicketRomanNumeral(ticketGraphicNumber),
    orderId: user.ticketWizard?.purchasedOrderId || null, ticketId: user.ticketWizard?.purchasedTicketId || null,
    huntOpen, points, found, total, rank,
    travel: { travelCountry: d.travelCountry || "CA", travelRegion: d.travelRegion || "", travelCity: d.travelCity || "", postalCode: d.postalCode || "" },
    travelPlans: { transport: d.transport || "", transportOther: d.transportOther || "", delegation: d.delegation || "", delegationSchool: d.delegationSchool || "", delegationOther: d.delegationOther || "", connectWithSchool: d.connectWithSchool || "", travelFunding: d.travelFunding || "", accommodation: d.accommodation || "" },
    sponsor: { sponsorConsent: !!d.sponsorConsent, opportunities: d.opportunities || [], opportunitiesOther: d.opportunitiesOther || "",
      techAreas: d.techAreas || [], techAreasOther: d.techAreasOther || "", workLocations: d.workLocations || [], workArrangement: d.workArrangement || "",
      linkedinUrl: d.linkedinUrl || "", githubUrl: d.githubUrl || "", portfolioUrl: d.portfolioUrl || "" },
    resumeRoast: !!d.resumeRoast,
    resume: d.resumeFileName ? { fileName: d.resumeFileName, size: d.resumeSize || 0, uploadedAt: d.resumeUploadedAt ? new Date(d.resumeUploadedAt).toISOString() : null } : null,
  };
  const baseURL = await getBaseUrl();
  const dbUser = JSON.parse(JSON.stringify(user.toObject())) as DbUser;
  return <div className="v2 v2-aero v2-attendee">
    <div className="v2-attendee__scene" aria-hidden="true" />
    <AeroDock user={session.user as Auth0User} dbUser={dbUser} linkedEmail={user.linked_email} baseURL={baseURL}
      huntOpen={huntOpen} submissionsOpen={huntOpen && process.env.SUBMISSIONS_ENABLED === "true"} />
    <AttendeeProfile initial={data} baseURL={baseURL} />
  </div>;
}
