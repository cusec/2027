import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Team } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { findOrCreateUser } from "@/lib/userService";
import { MAX_TEAM_SIZE } from "@/lib/challenges";

// POST - join by id (from the browse list) or by join code.
export async function POST(request: Request) {
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

  const teamId = typeof body.teamId === "string" ? body.teamId : null;
  const joinCode =
    typeof body.joinCode === "string" ? body.joinCode.trim().toUpperCase() : null;

  if (!teamId && !joinCode) {
    return NextResponse.json(
      { error: "Pick a team or enter a join code" },
      { status: 400 }
    );
  }

  await connectMongoDB();
  const user = await findOrCreateUser({
    email: session.user.email,
    name: session.user.name || "Delegate",
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await Team.findOne({ members: user._id });
  if (existing) {
    return NextResponse.json(
      { error: "You're already in a team. Leave it before joining another." },
      { status: 400 }
    );
  }

  const team = teamId
    ? await Team.findById(teamId)
    : await Team.findOne({ joinCode });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.members.length >= MAX_TEAM_SIZE) {
    return NextResponse.json(
      { error: `"${team.name}" is full (${MAX_TEAM_SIZE} members).` },
      { status: 400 }
    );
  }

  // $addToSet + a re-checked size guard: two people tapping join at once can
  // both pass the check above, so the size is re-read after the write.
  await Team.updateOne({ _id: team._id }, { $addToSet: { members: user._id } });

  const updated = await Team.findById(team._id);
  if (updated && updated.members.length > MAX_TEAM_SIZE) {
    await Team.updateOne({ _id: team._id }, { $pull: { members: user._id } });
    return NextResponse.json(
      { error: `"${team.name}" just filled up.` },
      { status: 409 }
    );
  }

  await updated?.populate("members", "name email");
  return NextResponse.json({ success: true, teamName: team.name });
}
