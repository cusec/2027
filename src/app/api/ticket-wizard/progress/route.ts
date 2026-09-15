import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User, DemographicInfo } from "@/lib/models";

// POST { step: "avatar" } - marks the wizard's avatar step complete.
// Avatar is a stub today (no real data), so this flag is the only signal
// that step exists; demographics/purchase completion is derived from real
// data elsewhere (see src/lib/ticketWizard.ts).
export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { step?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.step !== "avatar") {
    return NextResponse.json({ error: "Unsupported step" }, { status: 400 });
  }

  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const demographicsExist = await DemographicInfo.exists({ user: user._id });
  if (!demographicsExist) {
    return NextResponse.json({ error: "Complete demographics first" }, { status: 409 });
  }

  user.ticketWizard.avatarCompletedAt = new Date();
  user.ticketWizard.currentStep = "purchase";
  await user.save();

  return NextResponse.json({ success: true });
}
