import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { Challenge, Team, User } from "@/lib/models";
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

/** Everything about a team, for the one team the caller belongs to. */
function shape(team: {
  _id: unknown;
  challengeId: unknown;
  name: string;
  members: LeanMember[];
  joinCode: string;
  createdBy?: unknown;
}) {
  return {
    _id: String(team._id),
    challengeId: String(team.challengeId),
    name: team.name,
    joinCode: team.joinCode,
    createdBy: team.createdBy ? String(team.createdBy) : undefined,
    memberCount: (team.members || []).length,
    members: (team.members || []).map((m) => ({
      _id: String(m._id),
      name: m.name,
      email: m.email,
    })),
  };
}

/** What everyone else sees: enough to pick a team with space, nothing more.
    Join codes are invites and rosters are personal data, so neither leaves
    the team they belong to. */
function summarize(team: {
  _id: unknown;
  challengeId: unknown;
  name: string;
  members: LeanMember[];
}) {
  return {
    _id: String(team._id),
    challengeId: String(team.challengeId),
    name: team.name,
    memberCount: (team.members || []).length,
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

  // A delegate can be on one team per challenge, so their own teams come back
  // keyed by challenge rather than as a single value.
  const myTeams: Record<string, ReturnType<typeof shape>> = {};
  for (const team of teams) {
    const mine = (team.members as unknown as LeanMember[]).some(
      (m) => String(m._id) === String(user._id),
    );
    if (mine) {
      const full = shape(team as unknown as Parameters<typeof shape>[0]);
      myTeams[full.challengeId] = full;
    }
  }

  return NextResponse.json({
    success: true,
    teams: teams.map((t) =>
      summarize(t as unknown as Parameters<typeof summarize>[0]),
    ),
    myTeams,
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

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId : null;
  if (!challengeId) {
    return NextResponse.json(
      { error: "A challenge is required" },
      { status: 400 },
    );
  }

  const nameError = validateTeamName(body.name);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }
  const name = String(body.name).trim();

  await connectMongoDB();

  const challenge = await Challenge.findById(challengeId);
  if (!challenge || challenge.mode !== "group") {
    return NextResponse.json(
      { error: "That challenge does not use teams" },
      { status: 400 },
    );
  }
  const user = await findOrCreateUser({
    email: session.user.email,
    name: session.user.name || "Delegate",
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await Team.findOne({ challengeId, members: user._id });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "You're already in a team for this challenge. Leave it before creating another.",
      },
      { status: 400 },
    );
  }

  // Case-insensitive exact match via collation, so "Rust Picklers" and
  // "rust picklers" can't both exist. Avoids escaping the name into a regex.
  const clash = await Team.findOne({ challengeId, name }).collation({
    locale: "en",
    strength: 2,
  });
  if (clash) {
    return NextResponse.json(
      { error: "That team name is taken for this challenge" },
      { status: 400 },
    );
  }

  // Codes are random, so retry on the rare collision rather than failing.
  let team = null;
  for (let attempt = 0; attempt < 5 && !team; attempt += 1) {
    const joinCode = generateJoinCode();
    if (await Team.findOne({ joinCode })) continue;
    team = await Team.create({
      challengeId,
      name,
      members: [user._id],
      createdBy: user._id,
      joinCode,
    });
  }

  if (!team) {
    return NextResponse.json(
      { error: "Couldn't generate a join code. Try again." },
      { status: 500 },
    );
  }

  await team.populate("members", "name email");
  return NextResponse.json({
    success: true,
    team: shape(team.toObject()),
  });
}
