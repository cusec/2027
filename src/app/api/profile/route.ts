import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAttendeeSession } from "@/lib/attendeeSession";
import connectMongoDB from "@/lib/mongodb";
import { User, DemographicInfo } from "@/lib/models";
import { getWizardStatus } from "@/lib/ticketWizard";
import { parseTravelLocation } from "@/lib/travelLocation";
import { parseProfileSettings, getProfileEntitlements } from "@/lib/profileSettings";

export async function PATCH(request: Request) {
  const session = await getAttendeeSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await getWizardStatus(email)).purchaseComplete) return NextResponse.json({ error: "ticket-required" }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid" }, { status: 400 }); }
  const parsed = parseProfileSettings(body);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", field: parsed.field }, { status: 400 });
  if (parsed.group === "sponsor" && !getProfileEntitlements(session.user["cusec/roles"] ?? []).isSponsor) {
    return NextResponse.json({ error: "sponsor-required" }, { status: 403 });
  }
  await connectMongoDB();
  const user = await User.findOne({ email }).select("_id");
  if (!user) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const { group, fields } = parsed;
  if (group === "travel") {
    const location = parseTravelLocation(fields);
    if (!location.ok) return NextResponse.json({ error: "invalid", field: location.field }, { status: 400 });
    Object.assign(fields, location.location);
  }
  if (group === "avatar") {
    await User.updateOne({ _id: user._id }, { $set: fields }, { runValidators: true });
  } else if (group === "resume" && fields.resumeRoast) {
    const result = await DemographicInfo.updateOne(
      { user: user._id, resumePublicId: { $exists: true, $ne: "" } },
      { $set: { resumeRoast: true, resumeRoastConsentAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "resume-required" }, { status: 400 });
  } else {
    if (group === "resume") fields.resumeRoastConsentAt = null;
    if (group === "sponsor") {
      // Keep the original consent timestamp if consent is still enabled.
      const current = await DemographicInfo.findOne({ user: user._id }).select("sponsorConsent sponsorConsentAt");
      fields.sponsorConsentAt = fields.sponsorConsent ? current?.sponsorConsentAt ?? new Date() : null;
    }
    await DemographicInfo.updateOne({ user: user._id }, { $set: fields }, { upsert: true, runValidators: true });
    if (group === "account") await User.updateOne({ _id: user._id }, { $set: { name: `${fields.firstName} ${fields.lastName}` } });
  }
  revalidatePath("/[locale]/profile", "page");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
