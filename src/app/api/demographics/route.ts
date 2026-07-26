import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User, DemographicInfo } from "@/lib/models";

function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>"'`]/g, "")
    .replace(/[\\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((v): v is string => typeof v === "string").map(sanitizeInput);
}

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const HEAD_DELEGATE_VALUES = ["yes", "no", "unsure"];
const TICKET_TYPES = ["general", "vip"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET - the caller's own demographic survey answers, or null if not submitted yet.
// Scoped strictly to the authenticated session's own record.
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const demographics = await DemographicInfo.findOne({ user: user._id }).lean();
  return NextResponse.json({ demographics: demographics ?? null });
}

// PUT - upsert the caller's own demographic survey answers.
export async function PUT(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = {
    firstName: sanitizeInput(body.firstName),
    lastName: sanitizeInput(body.lastName),
    pronoun: sanitizeInput(body.pronoun),
    tshirtSize: sanitizeInput(body.tshirtSize),
    dietaryRestrictions: sanitizeInput(body.dietaryRestrictions),
    studentEmail: sanitizeInput(body.studentEmail).toLowerCase(),
    personalEmail: sanitizeInput(body.personalEmail).toLowerCase(),
    university: sanitizeInput(body.university),
    fieldOfStudy: sanitizeInput(body.fieldOfStudy),
    degreeCurrentlyPursuing: sanitizeInput(body.degreeCurrentlyPursuing),
    highestDegree: sanitizeInput(body.highestDegree),
    expectedGraduation: sanitizeInput(body.expectedGraduation),
    schoolHasHeadDelegate: sanitizeInput(body.schoolHasHeadDelegate),
    currentAffiliation: sanitizeInput(body.currentAffiliation),
    resumeUrl: sanitizeInput(body.resumeUrl),
    githubUrl: sanitizeInput(body.githubUrl),
    linkedinUrl: sanitizeInput(body.linkedinUrl),
    preferredTicketType: sanitizeInput(body.preferredTicketType),
    howDidYouHear: sanitizeInput(body.howDidYouHear),
    previouslyAttendedCUSEC: sanitizeArray(body.previouslyAttendedCUSEC),
    excitedEvents: sanitizeArray(body.excitedEvents),
    wantsHotelBooking: body.wantsHotelBooking === true,
    whyAttendCUSEC: sanitizeInput(body.whyAttendCUSEC),
    schoolCommunityInvolvement: sanitizeInput(body.schoolCommunityInvolvement),
    cusecAssociation: sanitizeInput(body.cusecAssociation),
  };

  const requiredFields: [string, string][] = [
    ["firstName", data.firstName],
    ["lastName", data.lastName],
    ["pronoun", data.pronoun],
    ["tshirtSize", data.tshirtSize],
    ["studentEmail", data.studentEmail],
    ["personalEmail", data.personalEmail],
    ["university", data.university],
    ["fieldOfStudy", data.fieldOfStudy],
    ["degreeCurrentlyPursuing", data.degreeCurrentlyPursuing],
    ["highestDegree", data.highestDegree],
    ["expectedGraduation", data.expectedGraduation],
    ["schoolHasHeadDelegate", data.schoolHasHeadDelegate],
    ["currentAffiliation", data.currentAffiliation],
    ["preferredTicketType", data.preferredTicketType],
  ];
  for (const [field, value] of requiredFields) {
    if (!value) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  if (!TSHIRT_SIZES.includes(data.tshirtSize)) {
    return NextResponse.json({ error: "Invalid t-shirt size" }, { status: 400 });
  }
  if (!HEAD_DELEGATE_VALUES.includes(data.schoolHasHeadDelegate)) {
    return NextResponse.json({ error: "Invalid head delegate answer" }, { status: 400 });
  }
  if (!TICKET_TYPES.includes(data.preferredTicketType)) {
    return NextResponse.json({ error: "Invalid ticket type" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(data.studentEmail) || !EMAIL_REGEX.test(data.personalEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (data.excitedEvents.length !== 3) {
    return NextResponse.json({ error: "Pick exactly 3 events" }, { status: 400 });
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await DemographicInfo.findOneAndUpdate(
    { user: user._id },
    { $set: { user: user._id, ...data } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Completing the survey is enough to guarantee the legacy scavenger
  // onboarding (personality quiz + email-link screens) never appears for a
  // wizard user, at any point they might abandon the rest of the wizard.
  user.hasSeenIntro = true;
  if (user.ticketWizard.currentStep === "demographics") {
    user.ticketWizard.currentStep = "avatar";
  }
  await user.save();

  // No PII in logs - this data is confidential.
  console.log(`Demographics saved for user ${user._id}`);

  return NextResponse.json({ success: true });
}
