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
const ATTENDEE_TYPES = ["student", "professional"];
const YES_NO = ["yes", "no"];
const TRAVEL_METHODS = ["plane", "train", "bus", "car", "local", "undecided"];
// CUSEC has run every year since 2003; 2026 is the latest past edition.
const ATTENDED_YEARS = Array.from({ length: 2026 - 2003 + 1 }, (_, i) =>
  String(2003 + i)
);

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

  const attendeeType = sanitizeInput(body.attendeeType);
  const isStudent = attendeeType === "student";
  const previouslyAttended = sanitizeInput(body.previouslyAttended);

  // Name, emails, university, graduation and degree are intentionally not
  // accepted here — Ticket Tailor's checkout already collects them, and
  // duplicating the ask is exactly what this survey was trimmed to avoid.
  const data = {
    attendeeType,
    pronoun: sanitizeInput(body.pronoun),
    tshirtSize: sanitizeInput(body.tshirtSize),
    dietaryRestrictions: sanitizeInput(body.dietaryRestrictions),

    // The branch that does not apply is stored blank rather than left off,
    // so switching the toggle can never leave stale answers behind.
    fieldOfStudy: isStudent ? sanitizeInput(body.fieldOfStudy) : "",
    schoolHasHeadDelegate: isStudent
      ? sanitizeInput(body.schoolHasHeadDelegate)
      : "unsure",
    company: isStudent ? "" : sanitizeInput(body.company),
    jobTitle: isStudent ? "" : sanitizeInput(body.jobTitle),

    resumeUrl: sanitizeInput(body.resumeUrl),
    githubUrl: sanitizeInput(body.githubUrl),
    linkedinUrl: sanitizeInput(body.linkedinUrl),

    travelFrom: sanitizeInput(body.travelFrom),
    travelMethod: sanitizeInput(body.travelMethod),

    howDidYouHear: sanitizeInput(body.howDidYouHear),
    previouslyAttended,
    previouslyAttendedYear:
      previouslyAttended === "yes"
        ? sanitizeInput(body.previouslyAttendedYear)
        : "",
    excitedEvents: sanitizeArray(body.excitedEvents),

    whyAttendCUSEC: sanitizeInput(body.whyAttendCUSEC),
    schoolCommunityInvolvement: sanitizeInput(body.schoolCommunityInvolvement),
    cusecAssociation: sanitizeInput(body.cusecAssociation),
  };

  const requiredFields: [string, string][] = [
    ["attendeeType", data.attendeeType],
    ["pronoun", data.pronoun],
    ["tshirtSize", data.tshirtSize],
    ["previouslyAttended", data.previouslyAttended],
    ["travelFrom", data.travelFrom],
    ["travelMethod", data.travelMethod],
  ];
  if (isStudent) {
    requiredFields.push(["fieldOfStudy", data.fieldOfStudy]);
  } else {
    requiredFields.push(["company", data.company]);
    requiredFields.push(["jobTitle", data.jobTitle]);
  }
  for (const [field, value] of requiredFields) {
    if (!value) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  if (!ATTENDEE_TYPES.includes(data.attendeeType)) {
    return NextResponse.json({ error: "Invalid attendee type" }, { status: 400 });
  }
  if (!TSHIRT_SIZES.includes(data.tshirtSize)) {
    return NextResponse.json({ error: "Invalid t-shirt size" }, { status: 400 });
  }
  if (isStudent && !HEAD_DELEGATE_VALUES.includes(data.schoolHasHeadDelegate)) {
    return NextResponse.json({ error: "Invalid head delegate answer" }, { status: 400 });
  }
  if (!TRAVEL_METHODS.includes(data.travelMethod)) {
    return NextResponse.json({ error: "Invalid travel method" }, { status: 400 });
  }
  if (!YES_NO.includes(data.previouslyAttended)) {
    return NextResponse.json({ error: "Invalid previously-attended answer" }, { status: 400 });
  }
  if (
    data.previouslyAttended === "yes" &&
    !ATTENDED_YEARS.includes(data.previouslyAttendedYear)
  ) {
    return NextResponse.json(
      { error: "Pick the year you attended (2003-2026)" },
      { status: 400 }
    );
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
