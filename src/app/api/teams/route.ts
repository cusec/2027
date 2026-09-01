import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Team, User } from "@/lib/models";
import connectMongoDB from "@/lib/mongodb";
import { findOrCreateUser } from "@/lib/userService";
import {
  MAX_TEAM_SIZE,
  generateJoinCode,
  validateTeamName,
} from "@/lib/challenges";

interface LeanMember {
  _id: unknown;
  name?: string;
  email?: string;
}

function shape(team: {
  _id: unknown;
  name: string;
  members: LeanMember[];
  joinCode: string;
  createdBy?: unknown;
}) {
  return {
    _id: String(team._id),
    name: team.name,
    joinCode: team.joinCode,
    createdBy: team.createdBy ? String(team.createdBy) : undefined,
    members: (team.members || []).map((m) => ({
      _id: String(m._id),
      name: m.name,
      email: m.email,
    })),
  };
}

// GET - every team, plus which one the caller belongs to. Teams are public so
// delegates can find one with space rather than needing an invite.
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

  const teams = await Team.find({})
    .populate("members", "name email")
    .sort({ createdAt: 1 })
    .lean();

  const shaped = teams.map((t) =>
    shape(t as unknown as Parameters<typeof shape>[0])
  );
  const mine =
    shaped.find((t) => t.members.some((m) => m._id === String(user._id))) ??
    null;

  return NextResponse.json({
    success: true,
    teams: shaped,
    myTeam: mine,
    maxTeamSize: MAX_TEAM_SIZE,
  });
}

// POST - create a team and join it. One team per delegate.
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

  const nameError = validateTeamName(body.name);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }
  const name = String(body.name).trim();

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
      { error: "You're already in a team. Leave it before creating another." },
      { status: 400 }
    );
  }

  // Case-insensitive exact match via collation, so "Rust Picklers" and
  // "rust picklers" can't both exist. Avoids escaping the name into a regex.
  const clash = await Team.findOne({ name }).collation({
    locale: "en",
    strength: 2,
  });
  if (clash) {
    return NextResponse.json(
      { error: "That team name is taken" },
      { status: 400 }
    );
  }

  // Codes are random, so retry on the rare collision rather than failing.
  let team = null;
  for (let attempt = 0; attempt < 5 && !team; attempt += 1) {
    const joinCode = generateJoinCode();
    if (await Team.findOne({ joinCode })) continue;
    team = await Team.create({
      name,
      members: [user._id],
      createdBy: user._id,
      joinCode,
    });
  }

  if (!team) {
    return NextResponse.json(
      { error: "Couldn't generate a join code. Try again." },
      { status: 500 }
    );
  }

  await team.populate("members", "name email");
  return NextResponse.json({
    success: true,
    team: shape(team.toObject()),
  });
}
