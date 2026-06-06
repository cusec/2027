import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import connectMongoDB from "@/lib/mongodb";
import { User } from "@/lib/models";

export async function PATCH(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { hasSeenIntro?: boolean; personalityType?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.hasSeenIntro === "boolean") {
    update.hasSeenIntro = body.hasSeenIntro;
  }
  if (typeof body.personalityType === "string") {
    update.personalityType = body.personalityType.slice(0, 64);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await connectMongoDB();
  await User.findOneAndUpdate(
    { email: session.user.email },
    { $set: update }
  );

  return NextResponse.json({ success: true });
}
